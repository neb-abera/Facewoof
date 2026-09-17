/*
 * Whose bucket a request lands in, behind Cloudflare and the Container Apps
 * ingress. Driven over HTTP through a real express app and a real
 * express-rate-limit, with the X-Forwarded-For header the app would see in
 * production: whatever the caller sent, then the caller's address as
 * Cloudflare appended it, then the Cloudflare edge as the ingress appended it.
 */
import type { Server } from "node:http";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { afterEach, describe, expect, it } from "vitest";
import { applyTrustProxy, trustedProxyHops } from "../../server/client-ip.ts";

const CF_EDGE = "172.70.1.1";
const ALICE = "203.0.113.7";
const BOB = "198.51.100.9";

let server: Server | undefined;

const start = async (hops: number) => {
  const app = express();
  applyTrustProxy(app, hops);
  // One request per address: the second from the same key is a 429.
  app.use(rateLimit({ windowMs: 60_000, limit: 1, legacyHeaders: false }));
  app.get("/", (req, res) => res.json({ ip: req.ip }));
  const base = await new Promise<string>((resolve) => {
    server = app.listen(0, () => {
      const address = server?.address();
      if (!address || typeof address === "string") throw new Error("no port");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
  return (forwardedFor: string, extra: Record<string, string> = {}) =>
    fetch(base, { headers: { "x-forwarded-for": forwardedFor, ...extra } });
};

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("the client address behind two proxies", () => {
  it("resolves to the entry Cloudflare appended, with two trusted hops", async () => {
    const get = await start(2);
    const res = await get(`${ALICE}, ${CF_EDGE}`);
    expect(await res.json()).toEqual({ ip: ALICE });
  });

  it("is not moved by entries the caller put in X-Forwarded-For", async () => {
    const get = await start(2);
    const first = await get(`10.0.0.1, ${ALICE}, ${CF_EDGE}`);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ip: ALICE });
    // A fresh forged identity on every request is still the same bucket.
    const second = await get(`10.0.0.2, 10.9.9.9, ${ALICE}, ${CF_EDGE}`);
    expect(second.status).toBe(429);
  });

  it("is not moved by a forged CF-Connecting-IP either", async () => {
    const get = await start(2);
    expect((await get(`${ALICE}, ${CF_EDGE}`)).status).toBe(200);
    const forged = await get(`${ALICE}, ${CF_EDGE}`, {
      "cf-connecting-ip": "10.0.0.3",
    });
    expect(forged.status).toBe(429);
  });

  it("gives two real clients behind one Cloudflare edge a bucket each", async () => {
    const get = await start(2);
    expect((await get(`${ALICE}, ${CF_EDGE}`)).status).toBe(200);
    expect((await get(`${BOB}, ${CF_EDGE}`)).status).toBe(200);
  });

  it("hands a shared store the same resolved address as its key", async () => {
    // The guest limiter keeps its counts in Postgres (rate-limit-store.ts),
    // keyed by whatever express-rate-limit gives the store. A stand-in store
    // records that key: it must be the visitor, never the edge or a forgery.
    const keys: string[] = [];
    const app = express();
    applyTrustProxy(app, 2);
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 100,
        legacyHeaders: false,
        store: {
          increment: async (key: string) => {
            keys.push(key);
            return { totalHits: 1, resetTime: new Date(Date.now() + 60_000) };
          },
          decrement: async () => {},
          resetKey: async () => {},
        },
      }),
    );
    app.get("/", (_req, res) => res.json({}));
    const base = await new Promise<string>((resolve) => {
      server = app.listen(0, () => {
        const address = server?.address();
        if (!address || typeof address === "string") throw new Error("no port");
        resolve(`http://127.0.0.1:${address.port}`);
      });
    });
    await fetch(base, {
      headers: { "x-forwarded-for": `10.0.0.1, ${ALICE}, ${CF_EDGE}` },
    });
    await fetch(base, { headers: { "x-forwarded-for": `${BOB}, ${CF_EDGE}` } });
    expect(keys).toEqual([ALICE, BOB]);
  });

  it("shared one bucket per edge under the old single hop (the bug)", async () => {
    const get = await start(1);
    expect((await get(`${ALICE}, ${CF_EDGE}`)).status).toBe(200);
    expect((await get(`${BOB}, ${CF_EDGE}`)).status).toBe(429);
  });

  it("believes no header at all with zero hops", async () => {
    const get = await start(0);
    const res = await get(`${ALICE}, ${CF_EDGE}`);
    expect(((await res.json()) as { ip: string }).ip).toMatch(/127\.0\.0\.1$/);
  });
});

describe("TRUST_PROXY_HOPS", () => {
  it("defaults to nothing trusted outside production", () => {
    expect(trustedProxyHops({})).toBe(0);
    expect(trustedProxyHops({ NODE_ENV: "development" })).toBe(0);
  });

  it("defaults to the single hop production has always had", () => {
    expect(trustedProxyHops({ NODE_ENV: "production" })).toBe(1);
  });

  it("takes the documented production value", () => {
    expect(
      trustedProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "2" }),
    ).toBe(2);
    expect(trustedProxyHops({ TRUST_PROXY_HOPS: "0" })).toBe(0);
  });

  it.each(["true", "-1", "1.5", "11", "loopback", "2 hops"])(
    "refuses to start on %j rather than guess",
    (value) => {
      expect(() => trustedProxyHops({ TRUST_PROXY_HOPS: value })).toThrow(
        /TRUST_PROXY_HOPS/,
      );
    },
  );
});
