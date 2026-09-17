// Order matters for the first two: .env has to be loaded before any module
// reads process.env, and telemetry has to be running before express and pg
// are loaded so their auto-instrumentation can patch them.
import "./env.ts";
import "./telemetry.ts";
import path from "node:path";

import { createApp } from "./app.ts";
import { pool as db } from "./db/database.ts";
import { purgeExpiredGuests } from "./db/index.ts";
import { prepareSchema } from "./db/migrate.ts";
import { warnIfUploadsUnsigned } from "./media.ts";
import { purgeExpiredRateLimits } from "./rate-limit-store.ts";
import { router } from "./routes.ts";
import { registerShutdown } from "./shutdown.ts";

const port = Number(process.env.PORT) || 3001;

export const app = createApp({
  router,
  clientDir: path.join(import.meta.dirname, "../dist"),
  checkDatabase: () => db.query("SELECT 1"),
});

// Guest accounts are throwaway. Sweep the expired ones once at boot and then
// hourly. The boot sweep is what keeps a crash loop honest: a process that
// never lives an hour never reaches the timer, and the sweep itself deletes
// in batches that each commit (server/db/guests.ts), so a backlog shrinks
// even if the process dies partway through.
const GUEST_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const sweepGuests = () =>
  purgeExpiredGuests(Number(process.env.GUEST_TTL_HOURS) || 24)
    .then(({ rowCount }) => {
      if (rowCount) console.log(`purged ${rowCount} expired guest account(s)`);
    })
    .catch((err: unknown) => console.error("guest sweep failed", err));

// The same hour, the same broom: rate limit windows that closed and whose
// caller never came back to overwrite them.
const sweepRateLimits = () =>
  purgeExpiredRateLimits(db).catch((err: unknown) =>
    console.error("rate limit sweep failed", err),
  );

// Only listen when run directly, so tests can import the app without binding.
if (import.meta.main) {
  warnIfUploadsUnsigned();
  db.query("SELECT 1")
    // Bring the schema up to date before serving. The runner takes an advisory
    // lock, so several replicas starting at once on a deploy is safe: one
    // applies, the rest wait and find nothing to do. With MIGRATE_ON_BOOT=false
    // (a runtime role with no DDL rights) it only checks nothing is pending.
    .then(() => prepareSchema())
    .then(() => {
      console.log("database connected");
      sweepGuests();
      sweepRateLimits();
      setInterval(() => {
        sweepGuests();
        sweepRateLimits();
      }, GUEST_SWEEP_INTERVAL_MS).unref();
      const server = app.listen(port, () =>
        console.log(`Server started on port ${port}`),
      );
      // Drain in-flight requests and close the pool on SIGTERM/SIGINT,
      // instead of dying mid-response when Docker's grace period runs out.
      registerShutdown({ server, pool: db });
    })
    .catch((err: unknown) => {
      const reason = err instanceof Error ? err.message : String(err);
      console.error("could not prepare the database:", reason);
      process.exit(1);
    });
}
