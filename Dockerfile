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
FROM node:26-alpine@sha256:ef24c5053d50fdc3e4e56eb4e7ddb7861874ab0fdc797046ba897581deb8e868 AS nodebase

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
# `node --watch` rather than nodemon: node restarts itself when an imported
# file changes, and it loads .ts straight off the disk, so there is nothing
# between the source and the process.
FROM deps AS api
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "server:dev"]

# ---- lint -------------------------------------------------------------------
# A leaf stage, so the production build never pays for it. Copies the tree in
# rather than mounting it, which is what makes it hermetic: what CI checks is
# what a reviewer would get from a fresh clone.
# Lint, typecheck, and the API contract: the committed OpenAPI document and
# the client types generated from it must be exactly what the route table
# produces (scripts/check-contract.sh).
FROM deps AS lint
COPY . .
RUN npx biome check . && npm run typecheck && npm run check:contract

# ---- unittest ---------------------------------------------------------------
# The unit layer: fast checks on the decisions inside the server, hermetic
# like lint, and a leaf the production build never pays for.
FROM deps AS unittest
COPY . .
RUN npm run test:unit

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

# TypeScript source, run as-is: Node 26 strips the type annotations when it
# loads a .ts file, so there is no compiled copy to keep in step with the
# source and nothing from devDependencies is needed at run time.
COPY server ./server
COPY --from=build /app/dist ./dist

# Drop privileges. The node images ship a `node` user for exactly this.
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.ts"]
