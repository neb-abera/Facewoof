#!/usr/bin/env bash
#
# e2e.sh — run the Playwright suite against a running instance, inside
# Playwright's own image. Arguments go straight to `playwright test`
# (a file filter, --workers=1, ...).
#
# The image tag is derived from @playwright/test in package.json, so the
# browsers and the package that drives them cannot drift apart: one pin, in
# one file, in one Dependabot ecosystem. Until 2026-09 the Dockerfile had an
# e2e stage with a FROM of its own; Dependabot bumped the two in separate PRs,
# a lockstep guard failed both, and neither could merge first. Same pattern as
# modern-webapp-template's scripts/verify.sh.
#
# The image is a test tool that never ships, so the tag is not digest-pinned:
# a digest would be a second pin with nothing to keep it in step.
#
#   BASE_URL       the instance under test     (default http://localhost:8080)
#   E2E_NETWORK    docker network to join      (default host; `make e2e` passes
#                  the compose network so `make run`'s container is reachable)
#   CI, ENTRA_PROVIDERS, ENTRA_ISSUER   passed through to the tests
#
# On failure the Playwright traces are copied to test-results/.
set -euo pipefail
cd "$(dirname "$0")/.."

version="$(sed -n 's|^ *"@playwright/test": *"\([0-9][0-9.]*\)",*$|\1|p' package.json)"
if [ -z "$version" ]; then
  echo "error: @playwright/test must be pinned to an exact version in package.json" >&2
  exit 1
fi
image="mcr.microsoft.com/playwright:v${version}-noble"

# Names derive from the directory so two checkouts never share a container or
# an npm cache.
name="$(basename "$PWD" | tr '[:upper:]' '[:lower:]')"
ctr="$name-e2e"
docker rm -f "$ctr" >/dev/null 2>&1 || true

echo "@playwright/test $version, image $image, against ${BASE_URL:-http://localhost:8080}"
status=0
docker run --name "$ctr" --network "${E2E_NETWORK:-host}" \
  -v "$PWD":/src:ro \
  -v "$name-npm:/npm-cache" -e npm_config_cache=/npm-cache \
  -e CI="${CI:-}" \
  -e BASE_URL="${BASE_URL:-http://localhost:8080}" \
  -e ENTRA_PROVIDERS="${ENTRA_PROVIDERS:-}" \
  -e ENTRA_ISSUER="${ENTRA_ISSUER:-}" \
  "$image" bash -c '
    set -e
    mkdir /w && cd /w
    cp /src/package.json /src/package-lock.json /src/playwright.config.js .
    cp -r /src/tests .
    npm ci --no-audit --no-fund
    npx playwright test "$@"
  ' playwright "$@" || status=$?

if [ "$status" -ne 0 ]; then
  # Traces are how you see what the browser saw.
  rm -rf test-results
  docker cp "$ctr":/w/test-results test-results >/dev/null 2>&1 \
    && echo "playwright traces copied to test-results/"
fi
docker rm -f "$ctr" >/dev/null 2>&1 || true
exit "$status"
