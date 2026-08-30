const { Pool } = require("pg");

// A pool, not a Client. The original code held one connection for the whole
// process: concurrent requests serialised behind it, and any dropped
// connection took the server down until it was restarted. Azure's Postgres
// closes idle connections, so that would have been a daily outage.
//
// Configuration comes from DATABASE_URL when it is set (how Azure and most
// hosts hand it over) and from discrete PG* variables otherwise.
/*
 * DATABASE_AUTH=entra switches the password for a Microsoft Entra access
 * token fetched through the container app's managed identity: no database
 * password exists anywhere. pg accepts an async password function and calls
 * it per connection, so tokens refresh themselves as the pool cycles.
 * Everything else (host, database, user - the managed identity's role, e.g.
 * facewoof-mi) still comes from the PG* variables. DATABASE_URL keeps
 * working unchanged for local dev and CI.
 */
const entraPassword = () => {
  const { DefaultAzureCredential } = require("@azure/identity");
  const credential = new DefaultAzureCredential();
  return async () => {
    const token = await credential.getToken(
      "https://ossrdbms-aad.database.windows.net/.default",
    );
    return token.token;
  };
};

const config =
  process.env.DATABASE_AUTH === "entra"
    ? {
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: entraPassword(),
        port: process.env.PGPORT || 5432,
      }
    : process.env.DATABASE_URL
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
