# syntax=docker/dockerfile:1
#
# Facewoof builds and runs entirely in containers: nothing but Docker needs to
# be installed on the machine.
#
#   deps    the dependency tree, installed from the lockfile
#   contract deps plus the client type generator (tools/api-types)
#   dev     the vite dev server, source bind mounted at run time
#   api     the express API in watch mode, source bind mounted at run time
#   dbtest  the tests that need a real database, run against one
#   build   the production client bundle
#   final   express serving the API and the built bundle on one port

# A named stage rather than an ARG deliberately: Dependabot cannot see an
# image behind ARG indirection, but it watches a literal FROM, and every
# consumer derives from this one stage so a bump moves them all together.
# Pinned to a digest so the build is reproducible and a tag repoint upstream
# cannot change what ships; Dependabot bumps the digest and the tag together.
FROM node:26-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070 AS nodebase

# ---- deps -------------------------------------------------------------------
FROM nodebase AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- apitypes ---------------------------------------------------------------
# openapi-typescript and the TypeScript 5 it needs, from their own manifest
# and lockfile (tools/api-types/package.json says why they cannot share the
# root's). Only node_modules leaves this stage.
FROM nodebase AS apitypes
WORKDIR /app/tools/api-types
COPY tools/api-types/package.json tools/api-types/package-lock.json ./
RUN npm ci

# ---- contract ---------------------------------------------------------------
# Everything that regenerates the API contract: the root tree for
# server/api/openapi.ts, the generator's tree for the client types. `make
# contract` runs this with the checkout mounted; lint builds on it.
FROM deps AS contract
COPY --from=apitypes /app/tools/api-types/node_modules ./tools/api-types/node_modules
CMD ["sh", "-c", "npm run openapi && npm run generate:api-types"]

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
FROM contract AS lint
COPY . .
RUN npx biome check . && npm run typecheck && npm run check:contract

# ---- unittest ---------------------------------------------------------------
# The unit layer: fast checks on the decisions inside the server, then the
# client's component tests in jsdom (vitest.client.config.ts), hermetic like
# lint, and a leaf the production build never pays for. The marker line lets
# checks.yml split the two runs' totals for the job summary.
FROM deps AS unittest
COPY . .
RUN npm run test:unit && echo "::client-tests::" && npm run test:client

# ---- dbtest -----------------------------------------------------------------
# The tests that need a real Postgres (tests/db): what the SQL does, which a
# stand-in for the pool cannot show. Unlike the stages above this one only
# builds the runner - the database is not there at build time - so it is run,
# with DATABASE_URL pointing at a migrated database: `make test-db` locally,
# the smoke job in CI. A leaf the production build never pays for.
FROM deps AS dbtest
COPY . .
CMD ["npm", "run", "test:db"]

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

# Prose linter, for scripts/check-prose.sh. Never built into anything: the
# stage exists so the image is a FROM line Dependabot sees and bumps, and the
# script reads it from here rather than pinning a version of its own.
FROM jdkato/vale:v3.22.0@sha256:0ef74c2c8331a2cc8739ecc8b4f7cc6672e61524c3697e8c8857bc86b724a28e AS vale

# Workflow and script linter, for `make lint-ci` and the CI lint job. Never
# built into anything, like the vale stage. The image carries actionlint and
# the shellcheck it runs on embedded run: blocks, and this FROM line is what
# Dependabot bumps.
FROM rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 AS actionlint

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

# --chown on everything the context contributes: COPY carries the mode the
# file had in the checkout, and a machine whose umask is 007 checks this
# repository out at rw-rw----. The image runs as `node`, which is not root,
# so it could not read its own package.json: EACCES at startup on every
# image built locally. CI never saw it, since a runner checks out
# world-readable. The image should not care what umask built it.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# TypeScript source, run as-is: Node 26 strips the type annotations when it
# loads a .ts file, so there is no compiled copy to keep in step with the
# source and nothing from devDependencies is needed at run time.
COPY --chown=node:node server ./server
COPY --from=build --chown=node:node /app/dist ./dist

# Drop privileges. The node images ship a `node` user for exactly this.
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.ts"]
