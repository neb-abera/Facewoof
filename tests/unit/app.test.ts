/*
 * The middleware order, from the outside.
 *
 * The real createApp(), on a random port, in front of a directory of fixture
 * files and two fake routes. Pinned here because it was measured against
 * production: every response, hashed assets included, carried three
 * Set-Cookie headers (XSRF-TOKEN, facewoof.sid, facewoof.sid.sig), and a
 * shared cache will not store a response that sets a cookie - Cloudflare
 * answered `cf-cache-status: BYPASS` for a bundle marked immutable. The
 * session and the CSRF token are the API's business, so only /api may set
 * them, and the CSRF refusal must still hold there.
 */
import fs from "node:fs";
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// A session is checked against the account's session version on every
// request; the one column involved stands in for the database here.
vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

import { buildRouter } from "../../server/api/express.ts";
import { defineRoute, reply } from "../../server/api/route.ts";
import { createApp } from "../../server/app.ts";
import { establishSession } from "../../server/session.ts";

const routes = [
  defineRoute({
    method: "get",
    path: "/api/test/whoami",
    summary: "who the session says is calling",
    auth: false,
    responses: { 200: z.object({ userId: z.number().nullable() }) },
    handler: async ({ userId }) => reply(200, { userId }),
  }),
  defineRoute({
    method: "post",
    path: "/api/test/sign-in",
    summary: "a state-changing request, the way guest sign-in is one",
    auth: false,
    body: z.object({ as: z.number().int() }),
    responses: { 200: z.object({ userId: z.number() }) },
    handler: async ({ body, session }) => {
      establishSession(session, body.as, 0);
      return reply(200, { userId: body.as });
    },
  }),
];

let server: Server;
let base: string;
let clientDir: string;
let databaseUp = true;

beforeAll(async () => {
  clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "facewoof-client-"));
  fs.mkdirSync(path.join(clientDir, "assets"));
  fs.writeFileSync(path.join(clientDir, "index.html"), "<!doctype html>app");
  fs.writeFileSync(
    path.join(clientDir, "assets", "index-abc123.js"),
    "console.log(1)",
  );
  fs.writeFileSync(path.join(clientDir, "favicon.svg"), "<svg/>");

  const app = createApp({
    router: buildRouter(routes),
    clientDir,
    checkDatabase: async () => {
      if (!databaseUp) throw new Error("connection refused");
    },
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  server.close();
  fs.rmSync(clientDir, { recursive: true, force: true });
});

/* The name=value pairs of a response's Set-Cookie headers, as a Cookie header. */
const jar = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

const tokenIn = (cookie: string) =>
  decodeURIComponent(
    cookie
      .split("; ")
      .find((c) => c.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );

describe("what is served without a cookie", () => {
  it("a hashed asset is immutable and sets no cookie", async () => {
    const res = await fetch(`${base}/assets/index-abc123.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("the document sets no cookie, at / or at a client-side route", async () => {
    for (const route of ["/", "/discover", "/favicon.svg"]) {
      const res = await fetch(base + route);
      expect(res.status, route).toBe(200);
      expect(res.headers.getSetCookie(), route).toEqual([]);
    }
    const doc = await fetch(`${base}/`);
    expect(doc.headers.get("cache-control")).toBe("no-cache");
    expect(await doc.text()).toBe("<!doctype html>app");
  });

  it("the health probe sets no cookie, and reports a lost database", async () => {
    const up = await fetch(`${base}/healthz`);
    expect(up.status).toBe(200);
    expect(up.headers.getSetCookie()).toEqual([]);

    databaseUp = false;
    const down = await fetch(`${base}/healthz`);
    databaseUp = true;
    expect(down.status).toBe(503);
    expect(await down.json()).toEqual({
      status: "no database",
      error: "connection refused",
    });
  });
});

describe("the API still hands out, and demands, the CSRF token", () => {
  it("a GET under /api sets the readable token cookie", async () => {
    const res = await fetch(`${base}/api/test/whoami`);
    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie();
    const token = cookies.find((c) => c.startsWith("XSRF-TOKEN="));
    expect(token, "the token cookie").toBeTruthy();
    // Readable by the client on any page, and never HttpOnly: the
    // double-submit pattern is the client echoing it.
    expect(token).toMatch(/Path=\//);
    expect(token).not.toMatch(/HttpOnly/i);
    // The session cookie holds the token's secret, and is HttpOnly.
    expect(cookies.find((c) => c.startsWith("facewoof.sid="))).toMatch(
      /httponly/i,
    );
  });

  it("refuses a write with no token, and one with a forged token", async () => {
    const cookie = jar(await fetch(`${base}/api/test/whoami`));
    const write = (headers: Record<string, string>) =>
      fetch(`${base}/api/test/sign-in`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, ...headers },
        body: JSON.stringify({ as: 42 }),
      });

    expect((await write({})).status).toBe(403);
    expect((await write({ "x-xsrf-token": "forged" })).status).toBe(403);
    // Not even with no cookies at all: there is no session to match.
    const bare = await fetch(`${base}/api/test/sign-in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ as: 42 }),
    });
    expect(bare.status).toBe(403);
  });

  it("accepts the write a client makes after one GET, and keeps the session", async () => {
    // Exactly the landing page: load the document (no cookie), ask the API
    // who is signed in (token arrives), then start the demo.
    const doc = await fetch(`${base}/`);
    expect(jar(doc)).toBe("");
    const cookie = jar(await fetch(`${base}/api/test/whoami`));

    const signIn = await fetch(`${base}/api/test/sign-in`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-xsrf-token": tokenIn(cookie),
      },
      body: JSON.stringify({ as: 42 }),
    });
    expect(signIn.status).toBe(200);

    const after = await fetch(`${base}/api/test/whoami`, {
      headers: { cookie: jar(signIn) },
    });
    expect(await after.json()).toEqual({ userId: 42 });
  });

  it("an /api path no route claims is still a JSON 404", async () => {
    const res = await fetch(`${base}/api/nothing-here`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });
});

/*
 * The same two properties under the production cookie names. Over HTTPS the
 * cookies carry the __Host- prefix (server/cookies.ts); the /api-only mount
 * must hold for them too, or the prefix would have put cookies back on the
 * bundle.
 */
describe("in production, behind TLS", () => {
  let prodServer: Server;
  let prodBase: string;

  beforeAll(async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "test-only");
    vi.stubEnv("TRUST_PROXY_HOPS", "1");
    const fresh = await import("../../server/app.ts");
    const adapter = await import("../../server/api/express.ts");
    const app = fresh.createApp({
      router: adapter.buildRouter(routes),
      clientDir,
      checkDatabase: async () => {},
    });
    await new Promise<void>((resolve) => {
      prodServer = app.listen(0, () => resolve());
    });
    const address = prodServer.address();
    if (!address || typeof address === "string") throw new Error("no port");
    prodBase = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => {
    prodServer.close();
    vi.unstubAllEnvs();
  });

  const https = { "x-forwarded-proto": "https" };

  it("static responses still set no cookie", async () => {
    for (const route of ["/", "/discover", "/assets/index-abc123.js"]) {
      const res = await fetch(prodBase + route, { headers: https });
      expect(res.status, route).toBe(200);
      expect(res.headers.getSetCookie(), route).toEqual([]);
    }
  });

  it("the API sets __Host- cookies, and accepts the token back under that name", async () => {
    const first = await fetch(`${prodBase}/api/test/whoami`, {
      headers: https,
    });
    const cookies = first.headers.getSetCookie();
    expect(cookies.map((c) => c.split("=")[0]).sort()).toEqual([
      "__Host-XSRF-TOKEN",
      "__Host-facewoof.sid",
      "__Host-facewoof.sid.sig",
    ]);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/secure/i);
      expect(cookie).toMatch(/path=\//i);
      expect(cookie).not.toMatch(/domain=/i);
    }

    const cookie = jar(first);
    const token = decodeURIComponent(
      cookie
        .split("; ")
        .find((c) => c.startsWith("__Host-XSRF-TOKEN="))
        ?.slice("__Host-XSRF-TOKEN=".length) ?? "",
    );
    const write = await fetch(`${prodBase}/api/test/sign-in`, {
      method: "POST",
      headers: {
        ...https,
        "content-type": "application/json",
        cookie,
        "x-xsrf-token": token,
      },
      body: JSON.stringify({ as: 42 }),
    });
    expect(write.status).toBe(200);
  });
});
