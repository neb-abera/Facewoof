import fs from "node:fs";
import path from "node:path";

import { pool } from "./database.ts";

const MIGRATIONS_DIR = path.join(import.meta.dirname, "migrations");

// An arbitrary but fixed key. Container Apps runs more than one replica, and
// they all start at once on a deploy: without a lock they would race to apply
// the same migration and one would fail on a duplicate table.
const LOCK_KEY = 8071975;

const readMigrations = () =>
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    // Numeric prefixes, so lexical order is apply order.
    .sort()
    .map((name) => ({
      name,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"),
    }));

/*
 * Apply any migrations this database has not seen.
 *
 * Each runs in its own transaction, so a failure leaves the ones before it
 * applied and recorded rather than half-applying anything.
 */
export async function migrate(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Blocks rather than failing, so a replica that loses the race waits and
    // then finds there is nothing left to do.
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

    try {
      const { rows } = await client.query<{ name: string }>(
        "SELECT name FROM schema_migrations",
      );
      const applied = new Set(rows.map((row) => row.name));
      const pending = readMigrations().filter((m) => !applied.has(m.name));

      if (!pending.length) {
        console.log("database is up to date");
        return 0;
      }

      // One after another, because a later migration may depend on an
      // earlier one having been applied.
      for (const migration of pending) {
        console.log(`applying ${migration.name}`);

        await client.query("BEGIN");
        try {
          await client.query(migration.sql);
          await client.query(
            "INSERT INTO schema_migrations (name) VALUES ($1)",
            [migration.name],
          );
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          const reason = err instanceof Error ? err.message : String(err);
          throw new Error(`migration ${migration.name} failed: ${reason}`);
        }
      }

      console.log(`applied ${pending.length} migration(s)`);
      return pending.length;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

/* The migrations this database has not recorded, without applying any. */
export async function pendingMigrations(): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const applied = new Set(rows.map((row) => row.name));
  return readMigrations()
    .map((m) => m.name)
    .filter((name) => !applied.has(name));
}

/*
 * What the server does about the schema before it listens.
 *
 * By default it migrates, as it always has, which requires the serving
 * process to connect as the role that owns the schema. MIGRATE_ON_BOOT=false
 * is the other half of running it as a role that cannot change the schema
 * at all (server/db/roles/runtime.sql): migrations are then a separate step
 * run as the owner, and the server only checks that step happened. Serving
 * against a schema that is behind the code fails in stranger ways than
 * refusing to start, and a revision that does not start never takes traffic.
 */
export async function prepareSchema(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (env.MIGRATE_ON_BOOT !== "false") {
    await migrate();
    return;
  }
  const pending = await pendingMigrations();
  if (pending.length) {
    throw new Error(
      `MIGRATE_ON_BOOT=false and the database is missing ${pending.join(", ")}: ` +
        "run the migrations (node server/db/migrate.ts) as the owner role first",
    );
  }
  console.log("database is up to date (migrations are not run at boot)");
}

// Runnable on its own (`npm run migrate`) as well as importable, so a deploy
// can migrate as a separate step rather than only at boot.
if (import.meta.main) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
