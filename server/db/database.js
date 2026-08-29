const { Pool } = require("pg");

// A pool, not a Client. The original code held one connection for the whole
// process: concurrent requests serialised behind it, and any dropped
// connection took the server down until it was restarted. Azure's Postgres
// closes idle connections, so that would have been a daily outage.
//
// Configuration comes from DATABASE_URL when it is set (how Azure and most
// hosts hand it over) and from discrete PG* variables otherwise.
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT || 5432,
    };

// Azure Database for PostgreSQL requires TLS. Off by default so a local
// container, which has no certificate, still connects.
if (process.env.PGSSL === "true") {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool({ ...config, max: 10, idleTimeoutMillis: 30000 });

// An error on an idle pooled connection is emitted on the pool, and an
// unhandled 'error' event would crash the process.
pool.on("error", (err) => {
  console.error("unexpected postgres error on idle client", err);
});

module.exports = pool;
