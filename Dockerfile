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

ARG NODE_IMAGE=node:22-alpine

# ---- deps -------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
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
FROM ${NODE_IMAGE} AS final
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

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
