#!/usr/bin/env bash
#
# check-db-roles.sh — the least-privilege database split, proven end to end.
#
# The serving process is meant to run as a role that can read and write rows
# and cannot change the schema (server/db/roles/runtime.sql), with migrations
# applied separately by the owner. That is only true while three things hold,
# and this checks all three against the compose Postgres:
#
#   1. the runtime role really cannot CREATE, ALTER, DROP or TRUNCATE, nor
#      write the migration ledger;
#   2. the app, started as that role with MIGRATE_ON_BOOT=false, works: the
#      browser suite's demo and authorisation specs pass against it (sign-in,
#      the feed, swipes and matches, packs, posts, playdates, sign-out);
#   3. with MIGRATE_ON_BOOT=false and migrations NOT applied, it refuses to
#      start instead of serving against a schema that is behind.
#
# A checker that has never failed proves nothing, so the denial probe is
# first pointed at the OWNER role, where every statement succeeds, and must
# report that as a failure before its verdict on the runtime role is trusted.
#
# Works in a scratch database (facewoof_roles) beside the development one and
# drops it afterwards; the two roles it creates are local to this Postgres.
#
#   IMAGE=<production image> [DOCKER_NETWORK=<net>] [DB_HOST=<host>] scripts/check-db-roles.sh
#
# DOCKER_NETWORK defaults to host (CI); `make check-db-roles` passes the
# compose network, where the database is `db`.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${IMAGE:?set IMAGE to the production image}"
network="${DOCKER_NETWORK:-host}"
if [ "$network" = "host" ]; then
  db_host="${DB_HOST:-localhost}"
  app_port=8081
  base_url="http://localhost:${app_port}"
else
  db_host="${DB_HOST:-db}"
  app_port=8080
  base_url="http://roles-under-test:${app_port}"
fi

database=facewoof_roles
owner=facewoof_owner
runtime=facewoof_app
owner_url="postgres://${owner}:owner-local-only@${db_host}:5432/${database}"
runtime_url="postgres://${runtime}:runtime-local-only@${db_host}:5432/${database}"
name="$(basename "$PWD" | tr '[:upper:]' '[:lower:]')"
app="$name-roles-app"

# psql inside the compose database container, as the local superuser (admin)
# or as one of the two roles over TCP.
admin() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U facewoof "$@"; }
as_role() {
  local role="$1" password="$2"
  shift 2
  docker compose exec -T -e PGPASSWORD="$password" db \
    psql -v ON_ERROR_STOP=1 -q -h 127.0.0.1 -U "$role" -d "$database" "$@"
}

cleanup() {
  docker rm -f "$app" >/dev/null 2>&1 || true
  admin -d postgres -c "DROP DATABASE IF EXISTS ${database} WITH (FORCE)" >/dev/null 2>&1 || true
  admin -d postgres -c "DROP ROLE IF EXISTS ${runtime}" -c "DROP ROLE IF EXISTS ${owner}" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

echo "== roles and a scratch database"
admin -d postgres \
  -c "CREATE ROLE ${owner} LOGIN PASSWORD 'owner-local-only'" \
  -c "CREATE ROLE ${runtime} LOGIN PASSWORD 'runtime-local-only'" \
  -c "CREATE DATABASE ${database} OWNER ${owner}"

echo "== 3. an unmigrated database and MIGRATE_ON_BOOT=false: the server must refuse to start"
# The owner creates an empty ledger so the refusal is about pending
# migrations, not about a missing table.
as_role "$owner" owner-local-only \
  -c "CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())" \
  -c "GRANT SELECT ON schema_migrations TO ${runtime}"
if out="$(docker run --rm --network "$network" \
  -e DATABASE_URL="$runtime_url" -e MIGRATE_ON_BOOT=false \
  -e SESSION_SECRET=ci-only-not-a-real-secret -e INSECURE_TRANSPORT=true \
  -e PORT="$app_port" "$IMAGE" 2>&1)"; then
  echo "error: the server started against an unmigrated database" >&2
  exit 1
fi
grep -q "MIGRATE_ON_BOOT=false and the database is missing" <<<"$out" || {
  echo "error: the server exited, but not for the expected reason:" >&2
  echo "$out" >&2
  exit 1
}
echo "ok: refused to start"

echo "== migrations, as the owner, from the image"
docker run --rm --network "$network" -e DATABASE_URL="$owner_url" "$IMAGE" npm run --silent migrate

echo "== grants"
as_role "$owner" owner-local-only -v runtime="$runtime" -v owner="$owner" \
  -f - < server/db/roles/runtime.sql

echo "== 1. what the runtime role must not be able to do"
# One statement per probe, each in a transaction that is rolled back, so a
# probe that wrongly succeeds (as it does for the owner) changes nothing.
probes=(
  "CREATE TABLE probe_created (id int)"
  "ALTER TABLE users ADD COLUMN probe_added text"
  "DROP TABLE posts"
  "TRUNCATE profile_photos"
  "CREATE INDEX probe_idx ON users (dog_name)"
  "INSERT INTO schema_migrations (name) VALUES ('9999_probe.sql')"
  "DELETE FROM schema_migrations"
  "CREATE SCHEMA probe_schema"
)
# Succeeds (exit 0) only if the role is DENIED every probe.
denied_everything() {
  local role="$1" password="$2" probe allowed=0
  for probe in "${probes[@]}"; do
    if as_role "$role" "$password" -c "BEGIN" -c "$probe" -c "ROLLBACK" >/dev/null 2>&1; then
      echo "  allowed: $probe"
      allowed=1
    else
      echo "  denied:  $probe"
    fi
  done
  [ "$allowed" -eq 0 ]
}

echo "-- the probe itself, against the owner (must report a failure)"
if denied_everything "$owner" owner-local-only; then
  echo "error: the probe says the OWNER cannot change the schema; it cannot be trusted" >&2
  exit 1
fi
echo "-- the runtime role"
denied_everything "$runtime" runtime-local-only || {
  echo "error: the runtime role can change the schema or the migration ledger" >&2
  exit 1
}
# And it can still do its job at the SQL level, including on a table a LATER
# migration creates (default privileges).
as_role "$owner" owner-local-only -c "CREATE TABLE probe_future (id serial PRIMARY KEY, note text)"
as_role "$runtime" runtime-local-only \
  -c "INSERT INTO probe_future (note) VALUES ('x')" \
  -c "UPDATE probe_future SET note = 'y'" \
  -c "DELETE FROM probe_future" >/dev/null
as_role "$owner" owner-local-only -c "DROP TABLE probe_future"
echo "ok: rows yes, schema no"

echo "== 2. the app, end to end, as the runtime role"
run_args=(-d --name "$app" --network "$network")
[ "$network" = "host" ] || run_args+=(--network-alias roles-under-test)
docker run "${run_args[@]}" \
  -e DATABASE_URL="$runtime_url" -e MIGRATE_ON_BOOT=false \
  -e SESSION_SECRET=ci-only-not-a-real-secret -e INSECURE_TRANSPORT=true \
  -e GUEST_LIMIT_PER_HOUR=200 -e PUBLIC_LIMIT_PER_MINUTE=600 \
  -e PORT="$app_port" "$IMAGE" >/dev/null
healthy=0
for _ in $(seq 1 30); do
  if docker exec "$app" node -e "fetch('http://127.0.0.1:${app_port}/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done
if [ "$healthy" -ne 1 ]; then
  echo "error: the app did not become healthy as the runtime role" >&2
  docker logs "$app" >&2 || true
  exit 1
fi

status=0
E2E_NETWORK="$network" BASE_URL="$base_url" CI="${CI:-}" scripts/e2e.sh demo authz || status=$?
if [ "$status" -ne 0 ]; then
  docker logs "$app" >&2 || true
  exit "$status"
fi
if docker logs "$app" 2>&1 | grep -qi "permission denied"; then
  echo "error: the app hit a permission error as the runtime role:" >&2
  docker logs "$app" 2>&1 | grep -i "permission denied" >&2
  exit 1
fi
echo "ok: the app works as ${runtime}, and ${runtime} cannot change the schema"
