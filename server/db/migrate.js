const fs = require("node:fs");
const path = require("node:path");

const db = require("./database");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

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
async function migrate() {
  const client = await db.connect();
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
      const { rows } = await client.query("SELECT name FROM schema_migrations");
      const applied = new Set(rows.map((row) => row.name));
      const pending = readMigrations().filter((m) => !applied.has(m.name));

      if (!pending.length) {
        console.log("database is up to date");
        return 0;
      }

      // An indexed loop rather than for..of or a map: these have to run one
      // after another, because a later migration may depend on an earlier one
      // having been applied.
      for (let i = 0; i < pending.length; i += 1) {
        const migration = pending[i];
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
          throw new Error(`migration ${migration.name} failed: ${err.message}`);
        }
        /* eslint-enable no-await-in-loop */
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

// Runnable on its own (`npm run migrate`) as well as importable, so a deploy
// can migrate as a separate step rather than only at boot.
if (require.main === module) {
  migrate()
    .then(() => db.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { migrate };
