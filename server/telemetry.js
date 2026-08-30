/*
 * OpenTelemetry to Azure Monitor, gated on the connection string the
 * container app provides. Local runs and CI have no string and stay
 * silent. Loaded before anything else in index.js so the auto-
 * instrumentation can patch express/pg/http as they are required — the
 * availability alerts say THAT something broke; this is how we see WHY.
 */
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
  // biome-ignore lint/correctness/useHookAtTopLevel: not a React hook — Azure's SDK entry point happens to be use-prefixed
  useAzureMonitor();
}
