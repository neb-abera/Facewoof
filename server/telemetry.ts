/*
 * OpenTelemetry to Azure Monitor, gated on the connection string the
 * container app provides. Local runs and CI have no string and stay
 * silent. Imported before anything else in index.ts so the auto-
 * instrumentation can patch express/pg/http as they are loaded — the
 * availability alerts say THAT something broke; this is how we see WHY.
 *
 * createRequire rather than `await import()`: the SDK has to be running
 * before express and pg are loaded, and a top-level await here would not
 * hold them back — a module's later siblings are evaluated while an earlier
 * async sibling is still pending. A synchronous require keeps the ordering
 * the instrumentation depends on, and keeps the SDK out of memory on every
 * instance that has no connection string.
 */
import { createRequire } from "node:module";

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  const require = createRequire(import.meta.url);
  const { useAzureMonitor } = require("@azure/monitor-opentelemetry") as {
    useAzureMonitor: () => void;
  };
  // biome-ignore lint/correctness/useHookAtTopLevel: not a React hook — Azure's SDK entry point happens to be use-prefixed
  useAzureMonitor();
}
