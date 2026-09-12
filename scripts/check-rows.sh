#!/usr/bin/env bash
#
# The row types in server/db/rows.ts are generated from the live schema by
# server/db/generate-rows.ts and committed, so every query typed by them
# can be checked without a database. That makes them a thing that can go
# stale. This regenerates them against a migrated database and diffs.
#
# Runs in the CI smoke job, which already has the production image built and
# a migrated Postgres on localhost, and locally through `make check-rows`.
# The generator runs inside the production image (it needs only pg, which
# the image has); this checkout's server/ is mounted over the image's so the
# committed file and the generator are the ones being checked.
#
#   IMAGE=<image> DATABASE_URL=<url> [DOCKER_NETWORK=<net>] scripts/check-rows.sh
set -euo pipefail

cd "$(dirname "$0")/.."

: "${IMAGE:?set IMAGE to the production image to run the generator in}"
: "${DATABASE_URL:?set DATABASE_URL to a migrated database}"
network="${DOCKER_NETWORK:-host}"

docker run --rm --network "$network" -e DATABASE_URL="$DATABASE_URL" \
  -v "$PWD/server:/app/server:ro" "$IMAGE" sh -c '
    set -e
    node /app/server/db/generate-rows.ts /tmp/rows.ts >/dev/null
    if diff -u /app/server/db/rows.ts /tmp/rows.ts; then
      echo "ok: server/db/rows.ts matches the schema"
    else
      echo "error: server/db/rows.ts is not what the schema generates; run make rows and commit" >&2
      exit 1
    fi
  '
