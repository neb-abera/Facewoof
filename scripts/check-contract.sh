#!/bin/sh
#
# The API contract is two generated files: server/openapi.json, produced from
# the route table by server/api/openapi.ts, and src/api-types.d.ts, produced
# from that document by openapi-typescript. Both are committed so a reader
# and the client's compiler can use them without running anything, which
# means both can go stale. This regenerates each into a temporary directory
# and fails on any difference — the same gate the template's verify.sh has.
#
# Runs in the Dockerfile's lint stage (Alpine, so POSIX sh rather than bash),
# which means CI cannot merge a schema change whose document or client types
# were not regenerated. Locally:
#
#   npm run openapi && npm run generate:api-types
#
# then commit both files.
set -eu

cd "$(dirname "$0")/.."

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

node server/api/openapi.ts "$out/openapi.json" >/dev/null
npx openapi-typescript "$out/openapi.json" --output "$out/api-types.d.ts" >/dev/null

status=0
if ! diff -u server/openapi.json "$out/openapi.json"; then
  echo "error: server/openapi.json is not what server/api/openapi.ts generates; run 'npm run openapi' and commit" >&2
  status=1
fi
if ! diff -u src/api-types.d.ts "$out/api-types.d.ts"; then
  echo "error: src/api-types.d.ts is not what openapi-typescript generates from the document; run 'npm run generate:api-types' and commit" >&2
  status=1
fi

[ "$status" -eq 0 ] && echo "ok: openapi.json and api-types.d.ts are exactly what the code generates"
exit "$status"
