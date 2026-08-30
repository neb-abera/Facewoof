/*
 * Graceful shutdown: on redeploy the container gets SIGTERM, and Docker
 * waits only stop_grace_period (default 10s, pinned in compose.yaml) before
 * SIGKILL. Left alone, node keeps serving until the kill arrives and every
 * in-flight request dies mid-response. The handler stops accepting new
 * connections, lets the ones in flight finish, closes the pg pool, and only
 * then exits. 8s finishes inside Docker's 10s window (and well inside Azure
 * Container Apps' 30s terminationGracePeriodSeconds) with margin for the
 * pool close and process exit.
 */
const GRACE_MS = 8000;

/*
 * Everything is injectable for the unit tests; index.js passes only the real
 * server and pool. Returns the handler so tests can drive it directly.
 */
function registerShutdown({
  server,
  pool,
  log = console,
  graceMs = GRACE_MS,
  exit = (code) => process.exit(code),
}) {
  let shuttingDown = false;

  const shutdown = (signal) => {
    // A second signal while draining must not re-run the sequence; the
    // deadline below already bounds how long the first one can take.
    if (shuttingDown) return;
    shuttingDown = true;
    log.log(`${signal} received: draining connections`);

    // If draining outlives the deadline (a hung request, a client that never
    // reads), exit anyway — beaten to SIGKILL is the alternative, and a
    // deliberate exit at least closes nothing mid-write that could have
    // finished.
    const deadline = setTimeout(() => {
      log.error(`still draining after ${graceMs}ms: exiting anyway`);
      exit(1);
    }, graceMs);
    deadline.unref?.();

    // close() refuses new connections and calls back once the last in-flight
    // request has finished. The pool closes only after that: a request still
    // draining may need one more query.
    server.close(() => {
      clearTimeout(deadline);
      pool.end().then(
        () => exit(0),
        (err) => {
          log.error("pg pool did not close cleanly", err);
          exit(1);
        },
      );
    });
    // close() still waits for idle keep-alive sockets; tell them to go so an
    // otherwise-quiet server exits immediately rather than at the deadline.
    server.closeIdleConnections?.();
  };

  // SIGTERM is what Docker and Container Apps send on stop; SIGINT covers
  // ctrl-C in a foreground `docker run` and local dev.
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  return shutdown;
}

module.exports = { registerShutdown, GRACE_MS };
