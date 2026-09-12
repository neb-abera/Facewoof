#!/usr/bin/env bash
#
# Regenerate the README's screenshots and demo clip from the production
# image. Everything runs in containers: the app and its database from this
# checkout, the browser from the same Playwright image scripts/e2e.sh runs
# the suite in (derived from @playwright/test in package.json), and ffmpeg
# for the conversion. Output lands in docs/media/.
#
#   make media
#
# The recording is a .webm straight from the browser. GitHub plays a video
# inline only when it was uploaded through its own UI, so the README shows a
# GIF (plays everywhere) and links the .mp4 for the full-quality clip.
set -euo pipefail

cd "$(dirname "$0")/../.."

IMAGE="$(basename "$PWD" | tr '[:upper:]' '[:lower:]')"
NET="${IMAGE}_default"
APP="${IMAGE}-media-app"
DB_URL=postgres://facewoof:facewoof@db:5432/facewoof
FFMPEG_IMAGE="linuxserver/ffmpeg:version-7.1-cli"
OUT="scripts/media/out"

cleanup() { docker rm -f "$APP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker build --target final -t "$IMAGE" .
docker compose up -d --wait db
docker run --rm --network "$NET" -e DATABASE_URL="$DB_URL" "$IMAGE" npm run migrate

cleanup
docker run -d --rm --name "$APP" --network "$NET" --network-alias media-under-test \
  -e DATABASE_URL="$DB_URL" -e SESSION_SECRET=local-only -e INSECURE_TRANSPORT=true \
  -e PORT=8080 "$IMAGE" >/dev/null
for _ in $(seq 1 30); do
  if docker run --rm --network "$NET" curlimages/curl:latest -sf http://media-under-test:8080/healthz >/dev/null 2>&1; then break; fi
  sleep 2
done

rm -rf "$OUT"
mkdir -p "$OUT" docs/media
# Playwright's own image at the exact version package.json pins, derived the
# way scripts/e2e.sh derives it, so the browser that takes the pictures is
# the browser the suite tests with. The checkout is mounted read-only and
# copied in; only the output directory is mounted writable.
version="$(sed -n 's|^ *"@playwright/test": *"\([0-9][0-9.]*\)",*$|\1|p' package.json)"
[ -n "$version" ] || { echo "error: @playwright/test must be pinned to an exact version in package.json" >&2; exit 1; }
docker run --rm --network "$NET" -e BASE_URL=http://media-under-test:8080 \
  -v "$PWD":/src:ro -v "$PWD/$OUT":/w/scripts/media/out \
  -v "$IMAGE-npm:/npm-cache" -e npm_config_cache=/npm-cache \
  "mcr.microsoft.com/playwright:v${version}-noble" bash -c '
    set -e
    cd /w
    cp /src/package.json /src/package-lock.json .
    cp -r /src/scripts/media/*.ts scripts/media/
    npm ci --no-audit --no-fund
    npx playwright test --config scripts/media/playwright.config.ts
  '

cleanup

# The screenshots the README embeds go over; the recording becomes a GIF for
# the README and an MP4 for anyone who wants the full clip. The GIF is scaled to
# 720px wide at 10 fps with a 128-colour palette: readable, and a few
# megabytes rather than the tens a raw conversion produces.
for name in landing discover match profile calendar packfeed discover-phone; do
  cp "$OUT/$name.png" docs/media/
done
docker run --rm -v "$PWD/$OUT":/in -v "$PWD/docs/media":/out "$FFMPEG_IMAGE" \
  -y -i /in/demo.webm -c:v libx264 -pix_fmt yuv420p -crf 28 -movflags +faststart /out/demo.mp4
docker run --rm -v "$PWD/$OUT":/in -v "$PWD/docs/media":/out "$FFMPEG_IMAGE" \
  -y -i /in/demo.webm \
  -vf "fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5" \
  /out/demo.gif

ls -la docs/media
