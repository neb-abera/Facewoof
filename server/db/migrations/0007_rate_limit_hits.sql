-- Rate limit counters that every replica shares.
--
-- express-rate-limit keeps its counts in the memory of the process by
-- default, and production runs one to three replicas (docs/DEPLOY.md) that a
-- deploy replaces wholesale. So a limit of ten demo accounts an hour was
-- really up to thirty, and went back to zero with every revision. This table
-- is where the limiters that matter keep their counts instead
-- (server/rate-limit-store.ts; server/limits.ts says which those are).
--
-- One row per limiter and caller, for one window: `hits` so far, and when the
-- window ends. A row past its reset_at is dead - the next hit overwrites it,
-- and the hourly sweep in server/index.ts deletes whatever nobody came back
-- for, which is what the index is for.
--
-- `key` is a SHA-256 of the caller's address, not the address: the count
-- only needs equality, and there is no reason for raw client IPs to sit in
-- the database and its backups.
CREATE TABLE rate_limit_hits (
  prefix    text        NOT NULL,
  key       text        NOT NULL,
  hits      integer     NOT NULL,
  reset_at  timestamptz NOT NULL,
  PRIMARY KEY (prefix, key)
);
CREATE INDEX rate_limit_hits_reset_at_idx ON rate_limit_hits (reset_at);
