# syntax=docker/dockerfile:1
#
# Facewoof builds and runs entirely in containers: nothing but Docker needs to
# be installed on the machine.
#
#   deps    the dependency tree, installed from the lockfile
#   dev     the vite dev server, source bind mounted at run time
#   api     the express API in watch mode, source bind mounted at run time
#   build   the production client bundle
#   final   express serving the API and the built bundle on one port

# A named stage rather than an ARG deliberately: Dependabot cannot see an
# image behind ARG indirection, but it watches a literal FROM, and every
# consumer derives from this one stage so a bump moves them all together.
# Pinned to a digest so the build is reproducible and a tag repoint upstream
# cannot change what ships; Dependabot bumps the digest and the tag together.
FROM node:26-alpine@sha256:2d984a15c9b54fd0aeb608b8e0d0d83529eb34d2966db27a1fb4f1edc3d298a3 AS nodebase

# ---- deps -------------------------------------------------------------------
FROM nodebase AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev --------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- api --------------------------------------------------------------------
FROM deps AS api
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "server:dev"]

# ---- lint -------------------------------------------------------------------
# A leaf stage, so the production build never pays for it. Copies the tree in
# rather than mounting it, which is what makes it hermetic: what CI checks is
# what a reviewer would get from a fresh clone.
FROM deps AS lint
COPY . .
RUN npx biome check .

# ---- unittest ---------------------------------------------------------------
# The unit layer: fast checks on the decisions inside the server, hermetic
# like lint, and a leaf the production build never pays for.
FROM deps AS unittest
COPY . .
RUN npm run test:unit

# ---- e2e --------------------------------------------------------------------
# The browser tests. Playwright's own image so the browser and its system
# libraries match exactly; a leaf, so the production build never pays for it.
#
# This tag and @playwright/test in package.json are pinned to the same exact
# version deliberately. A caret range on the package lets npm resolve a newer
# Playwright than the image's browsers, and it refuses to run rather than
# silently testing against the wrong browser. The digest pins the bytes; the
# tag stays because the lockstep guard in checks.yml parses the version from
# it, so keep the tag@digest form when bumping.
FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e AS e2e
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY playwright.config.js ./
COPY tests ./tests
CMD ["npx", "playwright", "test"]

# ---- build ------------------------------------------------------------------
FROM deps AS build
COPY . .
# Baked into the bundle at build time: vite resolves import.meta.env then, not
# at run time, so anything the client reads has to be present here.
ARG VITE_BASE_PATH=/
ARG VITE_CLOUD_NAME
ARG VITE_UPLOAD_PRESET
ENV VITE_BASE_PATH=${VITE_BASE_PATH} \
    VITE_CLOUD_NAME=${VITE_CLOUD_NAME} \
    VITE_UPLOAD_PRESET=${VITE_UPLOAD_PRESET}
RUN npm run build

# ---- final ------------------------------------------------------------------
FROM nodebase AS final
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# The base image trails Alpine's security fixes between releases: upgrade the
# packages so the image scan stays clean without waiting for a new node tag.
# npm deliberately stays at the version the base image bundles — a floating
# `npm install -g npm@latest` here was an unpinned input to the shipped image
# that no ecosystem could see or bump. The base image's npm is clean under
# .trivyignore today (verified by scan), the weekly trivy schedule catches
# any new CVE in it, and the digest-pinned FROM above is how it advances.
RUN apk --no-cache upgrade

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/dist ./dist

# Drop privileges. The node images ship a `node` user for exactly this.
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
