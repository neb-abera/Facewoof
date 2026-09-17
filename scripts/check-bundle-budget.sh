#!/usr/bin/env bash
#
# check-bundle-budget.sh — fail if the production bundle outgrew
# bundle-budget.json.
#
# Runs scripts/bundle-budget.ts inside the production image, against the
# dist/ that image actually ships: the bundle being measured is the one that
# would deploy, and the node doing the measuring is the Dockerfile's, so no
# toolchain version is named here. This checkout's script and budget file are
# mounted in, so they are the ones being applied.
#
#   IMAGE=<production image> scripts/check-bundle-budget.sh
#
# `make budget` builds the image first. The failure path is proved by
# tests/unit/bundle-budget.test.ts, which feeds the same script an
# over-budget build.
set -euo pipefail

cd "$(dirname "$0")/.."

: "${IMAGE:?set IMAGE to the production image whose dist/ is to be measured}"

docker run --rm --network none \
  -v "$PWD/scripts/bundle-budget.ts:/budget/bundle-budget.ts:ro" \
  -v "$PWD/bundle-budget.json:/budget/bundle-budget.json:ro" \
  "$IMAGE" node /budget/bundle-budget.ts \
    --dist /app/dist --budget /budget/bundle-budget.json
