#!/usr/bin/env bash
#
# migrate-production.sh: run the image's migration runner against the
# production database as the Postgres role facewoof-migrator, with the Entra
# token of whoever `az` is signed in as. In the deploy workflow that is the
# facewoof-migrator managed identity, through its GitHub federated credential.
#
#   scripts/migrate-production.sh <image> list    name pending migrations, apply nothing
#   scripts/migrate-production.sh <image> apply   apply them
#
# The token is the password. It lasts about an hour and reaches the container
# through an env file that is mode 600 and deleted on exit, so it is never on
# a command line. The container's exit code is this script's exit code.
#
# POSTGRES_HOST, POSTGRES_DATABASE and MIGRATOR_ROLE override the server, the
# database and the role.
set -euo pipefail

usage="usage: migrate-production.sh <image> list|apply"
image="${1:?$usage}"
mode="${2:?$usage}"
host="${POSTGRES_HOST:-abera-postgres.postgres.database.azure.com}"
database="${POSTGRES_DATABASE:-facewoof}"
role="${MIGRATOR_ROLE:-facewoof-migrator}"

case "$mode" in
  list) args=(node server/db/migrate.ts list) ;;
  apply) args=(node server/db/migrate.ts) ;;
  *)
    echo "error: ${usage}" >&2
    exit 2
    ;;
esac

token="$(az account get-access-token --resource-type oss-rdbms --query accessToken --output tsv)"
if [ -z "$token" ]; then
  echo "error: az returned no Postgres access token" >&2
  exit 1
fi
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "::add-mask::${token}"
fi

env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
chmod 600 "$env_file"
# The PG* variables and no DATABASE_URL or DATABASE_AUTH: the token above is
# the password, and Entra mode would ask the container for a managed identity
# it does not have (server/db/database.ts).
{
  printf 'PGHOST=%s\n' "$host"
  printf 'PGPORT=5432\n'
  printf 'PGDATABASE=%s\n' "$database"
  printf 'PGUSER=%s\n' "$role"
  printf 'PGPASSWORD=%s\n' "$token"
  printf 'PGSSL=true\n'
} > "$env_file"

echo "migrate ${mode}: ${database} on ${host} as ${role}, image ${image}"
docker run --rm --env-file "$env_file" "$image" "${args[@]}"
