/*
 * Whose address a request is counted against.
 *
 * Every rate limit is keyed on req.ip, and behind proxies req.ip is whatever
 * `trust proxy` makes of X-Forwarded-For. Each proxy appends the address it
 * received the request from, so the header reads, left to right:
 *
 *   <anything the caller sent>, <the caller, as the first proxy saw it>, <proxy>, ...
 *
 * Only the entries appended by proxies we run are true, and they are on the
 * right. A hop COUNT is therefore the setting that cannot be spoofed: with N
 * trusted hops express skips the socket peer and N-1 entries from the right
 * and takes the next one, which a proxy of ours wrote. Whatever a caller
 * puts in the header lands to the left of that and is never read.
 *
 * Production is client -> Cloudflare -> Container Apps ingress -> app, which
 * is two hops. The old hard-coded 1 stopped at the entry the ingress wrote —
 * the Cloudflare edge — so everyone behind one Cloudflare PoP shared a bucket.
 *
 * Why not CF-Connecting-IP: it is only trustworthy when the request really
 * came through Cloudflare, and the app cannot see that for itself (its socket
 * peer is the ingress, and proving the hop before it would mean carrying
 * Cloudflare's address ranges in code, to drift). Both approaches rest on the
 * origin accepting Cloudflare alone, which the ingress rules enforce; given
 * that, the count needs no list to maintain and no vendor header.
 *
 * Too low a count is safe (coarser buckets); too high is not (the caller's
 * own header entry gets read). So the default is the low one: 0 outside
 * production, where nothing is in front, and in production the 1 it has
 * always been until the deployment says otherwise.
 */
import type { Express } from "express";

const MAX_HOPS = 10;

export function trustedProxyHops(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.TRUST_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") {
    return env.NODE_ENV === "production" ? 1 : 0;
  }
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0 || hops > MAX_HOPS) {
    // `true`, a CIDR list or a typo would each silently change who gets
    // believed. A number of hops or a refusal to start.
    throw new Error(
      `TRUST_PROXY_HOPS must be a whole number of proxy hops between 0 and ${MAX_HOPS}`,
    );
  }
  return hops;
}

export function applyTrustProxy(app: Express, hops = trustedProxyHops()) {
  app.set("trust proxy", hops);
  return hops;
}
