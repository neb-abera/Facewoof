/*
 * A session's whole life, over HTTP: key rotation, server-side revocation,
 * the absolute lifetime and the production cookie names.
 *
 * The app is the real session middleware, the real requireUser and the real
 * sign-out route behind the real adapter. The only stand-in is the one table
 * column involved: users.session_version, held in a Map.
 */
import type { Server } from "node:http";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const versions = new Map<number, number>();

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(
    async (userId: number) => versions.get(userId) ?? null,
  ),
  bumpSessionVersion: vi.fn(async (userId: number) => {
    versions.set(userId, (versions.get(userId) ?? 0) + 1);
  }),
}));

// The sign-out route lives beside the sign-in routes, which read the rest of
// the database layer; none of that is under test here.
vi.mock("../../server/db/index.ts", () => ({
  createGuestUser: vi.fn(),
  getCurrentUserPromise: vi.fn(),
}));

let server: Server | undefined;

/* A fresh copy of the app under the given environment. */
async function start(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);

  const { buildRouter } = await import("../../server/api/express.ts");
  const { defineRoute, reply } = await import("../../server/api/route.ts");
  const { logout } = await import("../../server/controllers/auth.ts");
  const { csrf } = await import("../../server/csrf.ts");
  const { establishSession, session } = await import("../../server/session.ts");

  const routes = [
    logout,
    defineRoute({
      method: "get",
      path: "/api/test/sign-in",
      summary: "sign in as user 7, the way the real sign-in routes do",
      auth: false,
      responses: { 200: z.object({}) },
      handler: async ({ session: s }) => {
        establishSession(s, 7, versions.get(7) ?? 0);
        return reply(200, {});
      },
    }),
    defineRoute({
      method: "get",
      path: "/api/test/private",
      summary: "behind requireUser",
      auth: true,
      responses: { 200: z.object({ userId: z.number() }) },
      handler: async ({ userId }) => reply(200, { userId }),
    }),
  ];

  const app = express();
  // As behind the ingress: the forwarded protocol is believed, so a Secure
  // cookie can be set.
  app.set("trust proxy", 1);
  app.use(session);
  app.use(express.json());
  app.use(csrf);
  app.use(buildRouter(routes));
  const base = await new Promise<string>((resolve) => {
    server = app.listen(0, () => {
      const address = server?.address();
      if (!address || typeof address === "string") throw new Error("no port");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });

  const jar = new Map<string, string>();
  const setCookies: string[] = [];
  const call = async (path: string, method = "GET", cookies = jar) => {
    const token = cookies.get("XSRF-TOKEN") ?? cookies.get("__Host-XSRF-TOKEN");
    const res = await fetch(base + path, {
      method,
      headers: {
        "x-forwarded-proto": "https",
        cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(token ? { "x-xsrf-token": decodeURIComponent(token) } : {}),
      },
    });
    for (const cookie of res.headers.getSetCookie()) {
      setCookies.push(cookie);
      const [pair = ""] = cookie.split(";");
      const [name = "", ...value] = pair.split("=");
      if (cookies === jar) jar.set(name, value.join("="));
    }
    return res;
  };
  return { call, jar, setCookies };
}

beforeEach(() => {
  versions.clear();
  versions.set(7, 0);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  server?.close();
  server = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("rotating SESSION_SECRET", () => {
  it("keeps old cookies valid while the old key is still listed, and drops them when it is removed", async () => {
    const before = await start({ SESSION_SECRET: "old-key" });
    await before.call("/api/test/sign-in");
    expect((await before.call("/api/test/private")).status).toBe(200);
    const issuedUnderOldKey = new Map(before.jar);
    server?.close();

    // The documented rotation: the new key goes first, the old one stays.
    const during = await start({ SESSION_SECRET: "new-key, old-key" });
    const res = await during.call(
      "/api/test/private",
      "GET",
      issuedUnderOldKey,
    );
    expect(res.status, "a cookie signed with the old key still verifies").toBe(
      200,
    );
    // New sessions are signed with the first key...
    await during.call("/api/test/sign-in");
    const issuedUnderNewKey = new Map(during.jar);
    server?.close();

    // ...so once the old key is removed they carry on, and old cookies stop.
    const after = await start({ SESSION_SECRET: "new-key" });
    expect(
      (await after.call("/api/test/private", "GET", issuedUnderNewKey)).status,
    ).toBe(200);
    expect(
      (await after.call("/api/test/private", "GET", issuedUnderOldKey)).status,
    ).toBe(401);
  });
});

describe("revoking a session", () => {
  it("kills a copied cookie when its owner signs out", async () => {
    const app = await start({ SESSION_SECRET: "k" });
    await app.call("/api/test/sign-in");
    // What an attacker who lifted the cookie holds.
    const stolen = new Map(app.jar);
    expect((await app.call("/api/test/private", "GET", stolen)).status).toBe(
      200,
    );

    expect((await app.call("/api/auth/logout", "POST")).status).toBe(204);

    const replay = await app.call("/api/test/private", "GET", stolen);
    expect(replay.status, "the server no longer honours it").toBe(401);
    expect(
      vi
        .mocked(console.log)
        .mock.calls.map((c) => String(c[0]))
        .some((line) => line.includes('"auth.session_revoked"')),
    ).toBe(true);
  });

  it("cannot be used to sign the owner out again once revoked", async () => {
    const app = await start({ SESSION_SECRET: "k" });
    await app.call("/api/test/sign-in");
    const stolen = new Map(app.jar);
    await app.call("/api/auth/logout", "POST");
    await app.call("/api/test/sign-in");
    expect(versions.get(7)).toBe(1);

    await app.call("/api/auth/logout", "POST", stolen);
    expect(versions.get(7), "a dead cookie bumps nothing").toBe(1);
    expect((await app.call("/api/test/private")).status).toBe(200);
  });

  it("refuses a session whose account no longer exists", async () => {
    const app = await start({ SESSION_SECRET: "k" });
    await app.call("/api/test/sign-in");
    versions.delete(7);
    expect((await app.call("/api/test/private")).status).toBe(401);
  });

  it("has an absolute lifetime the server enforces, whatever the cookie says", async () => {
    const app = await start({ SESSION_SECRET: "k" });
    await app.call("/api/test/sign-in");
    const kept = new Map(app.jar);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 23 * 60 * 60 * 1000);
    expect((await app.call("/api/test/private", "GET", kept)).status).toBe(200);
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    expect((await app.call("/api/test/private", "GET", kept)).status).toBe(401);
  });
});

describe("cookie names", () => {
  it("carry the __Host- prefix in production, with everything it requires", async () => {
    const app = await start({ NODE_ENV: "production", SESSION_SECRET: "k" });
    await app.call("/api/test/sign-in");
    expect((await app.call("/api/test/private")).status).toBe(200);

    const names = [...app.jar.keys()].sort();
    expect(names).toEqual([
      "__Host-XSRF-TOKEN",
      "__Host-facewoof.sid",
      "__Host-facewoof.sid.sig",
    ]);
    for (const cookie of app.setCookies) {
      const attributes = cookie.toLowerCase();
      expect(attributes).toContain("secure");
      expect(attributes).toContain("path=/");
      expect(attributes).not.toContain("domain=");
    }
    // Signing out still works under the prefixed names.
    expect((await app.call("/api/auth/logout", "POST")).status).toBe(204);
  });

  it("stay unprefixed over plain HTTP, where a browser would refuse the prefix", async () => {
    for (const env of [
      { SESSION_SECRET: "k" },
      {
        NODE_ENV: "production",
        SESSION_SECRET: "k",
        INSECURE_TRANSPORT: "true",
      },
    ]) {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const app = await start(env);
      await app.call("/api/test/sign-in");
      expect([...app.jar.keys()].sort()).toEqual([
        "XSRF-TOKEN",
        "facewoof.sid",
        "facewoof.sid.sig",
      ]);
      expect(app.setCookies.join().toLowerCase()).not.toContain("secure");
      server?.close();
    }
  });

  it("ignores a production cookie under the old name, so the visitor signs in again", async () => {
    const dev = await start({ SESSION_SECRET: "k" });
    await dev.call("/api/test/sign-in");
    const legacy = new Map(dev.jar);
    server?.close();

    const prod = await start({ NODE_ENV: "production", SESSION_SECRET: "k" });
    const res = await prod.call("/api/test/private", "GET", legacy);
    expect(res.status).toBe(401);
  });
});
