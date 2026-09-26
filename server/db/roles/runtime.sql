-- The serving process's database role: rows, and nothing else.
--
-- The app used to connect as the role that owns the schema, because it ran
-- its own migrations at boot. Whatever reached the database through the app
-- (an injection, a compromised dependency, a stolen token) could therefore
-- DROP, ALTER and CREATE. Split in two: an OWNER role runs migrations
-- (`node server/db/migrate.ts`, as a separate step), and this RUNTIME role
-- serves requests with SELECT/INSERT/UPDATE/DELETE and sequence use only.
-- No CREATE on the schema, no TEMPORARY, no TRUNCATE, no ownership, and the
-- migration ledger is read-only to it.
--
-- Run as the owner of the database and the tables (or an admin who holds
-- both), after the migrations, against the app's database. It does not
-- create either role. Locally that is CREATE ROLE. On Azure it is
-- pgaadauth_create_principal_with_oid for a managed identity. It only
-- grants, and it is idempotent: run it again after adding a role or
-- restoring.
--
--   psql "$OWNER_URL" -v ON_ERROR_STOP=1 \
--        -v runtime=facewoof_app -v owner=facewoof_owner \
--        -f server/db/roles/runtime.sql
--
-- docs/DEPLOY.md has the production procedure; scripts/check-db-roles.sh
-- (`make check-db-roles`, and the CI smoke job) proves the app works end to
-- end as this role and that the role cannot change the schema.

\if :{?runtime}
\else
  \echo 'set the runtime role:  -v runtime=<role>'
  \quit
\endif
\if :{?owner}
\else
  \echo 'set the role that runs migrations:  -v owner=<role>'
  \quit
\endif

-- PUBLIC's defaults give every role more than it was granted: TEMPORARY on
-- the database, and before PostgreSQL 15 CREATE on schema public. CONNECT
-- stays with PUBLIC. Who may log in is the server's authentication, and
-- revoking CONNECT could lock out an administrator who does not own this
-- database. Revoking TEMPORARY needs the database's owner. DBNAME is psql's
-- own variable for the database it is connected to.
REVOKE TEMPORARY ON DATABASE :"DBNAME" FROM PUBLIC;
REVOKE ALL ON DATABASE :"DBNAME" FROM :"runtime";
GRANT CONNECT ON DATABASE :"DBNAME" TO :"runtime";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM :"runtime";
GRANT USAGE ON SCHEMA public TO :"runtime";

-- Start from nothing, so re-running after a privilege was widened by hand
-- puts it back.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM :"runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM :"runtime";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime";

-- The ledger of applied migrations: the server reads it at boot to refuse
-- to serve an out-of-date schema (MIGRATE_ON_BOOT=false), and never writes it.
REVOKE INSERT, UPDATE, DELETE ON schema_migrations FROM :"runtime";

-- Tables and sequences a FUTURE migration creates get the same grants, so a
-- deploy that adds a table does not also need this file re-run. Default
-- privileges belong to the role that creates the objects, hence FOR ROLE.
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"runtime";
