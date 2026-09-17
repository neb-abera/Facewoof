/*
 * What the session and CSRF cookies are called, and whether they are Secure.
 *
 * Over HTTPS both carry the __Host- prefix. A browser only accepts a cookie
 * with that name if it is Secure, has Path=/ and has no Domain, and will not
 * let any other origin set one — so a page on a sibling subdomain (or a
 * network attacker on plain HTTP) can no longer plant a session or CSRF
 * cookie for this host. Both middlewares already set Path=/ and no Domain.
 *
 * Over plain HTTP (development, and a production image deliberately run with
 * INSECURE_TRANSPORT for testing) a browser would refuse the prefixed name
 * outright, so the bare names stay. The client looks for either (src/api.ts).
 *
 * Renaming the production cookies means sessions issued under the old names
 * are simply not seen: those visitors sign in again, once.
 */
import { insecureTransport } from "./insecure-transport.ts";

export const secureCookies =
  process.env.NODE_ENV === "production" && !insecureTransport;

export const cookieName = (name: string) =>
  secureCookies ? `__Host-${name}` : name;
