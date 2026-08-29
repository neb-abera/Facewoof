/*
 * Whether this instance is being served over plain HTTP on purpose.
 *
 * Production sits behind Azure's TLS termination and never sets this. Two of
 * the security measures here are correct in production and make the app
 * impossible to test over HTTP:
 *
 *   - the session cookie is Secure, so a browser will not send it back;
 *   - the CSP carries upgrade-insecure-requests, so the browser rewrites every
 *     asset URL to https:// and the bundle fails to load at all, leaving a
 *     blank page.
 *
 * One flag covers both rather than one per symptom, and it is named so nobody
 * reaches for it casually. It warns on start-up when it is on.
 */
const insecureTransport = process.env.INSECURE_TRANSPORT === "true";

if (insecureTransport) {
  console.warn(
    "INSECURE_TRANSPORT is set: the session cookie will be sent over plain HTTP " +
      "and the CSP will not upgrade insecure requests. This must not be set in production.",
  );
}

module.exports = { insecureTransport };
