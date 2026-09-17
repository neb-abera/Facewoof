/*
 * Security events, driven over HTTP: each thing worth knowing about writes
 * one JSON line, and no line ever carries a cookie, a token, an email
 * address, a request body or a query string.
 *
 * The app under test is assembled from the real pieces — the session, the
 * CSRF wrapper, a limiter built on the shared options, requireUser, the
 * route adapter and the real sign-in, sign-out and OIDC callback routes —
 * with the database stubbed at the module boundary.
 */
import type { Server } from "node:http";
import express from "express";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { z } from "zod";

// The guest limiter counts in Postgres; here it counts in memory.
vi.mock(
  "../../server/rate-limit-store.ts",
  () => import("./helpers/memory-rate-limit-store.ts"),
);

vi.mock("../../server/db/index.ts", () => ({
  createGuestUser: vi.fn(async () => ({
    user_id: 41,
    dog_name: "Biscuit",
    owner_name: "Guest",
    dog_breed: null,
    age: null,
    vaccination: false,
    discoverable: false,
    owner_email: "guest-secret-address@facewoof.app",
    location: "10011",
    likes_one: null,
    likes_two: null,
    likes_three: null,
    is_guest: true,
    created_at: new Date(),
    demo_of: null,
    cloned_from: null,
    onboarded_at: new Date(),
    size: null,
    energy: null,
    best_time: null,
    bio: null,
    session_version: 0,
  })),
  getCurrentUserPromise: vi.fn(async () => ({ rows: [] })),
  findOrCreateExternalUser: vi.fn(),
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(async () => 1),
  countLiveGuests: vi.fn(async () => 0),
}));

const { buildRouter } = await import("../../server/api/express.ts");
const { defineRoute, reply } = await import("../../server/api/route.ts");
const { guestLogin, logout } = await import("../../server/controllers/auth.ts");
const { callback } = await import("../../server/controllers/oidc.ts");
const { csrf } = await import("../../server/csrf.ts");
const { applyTrustProxy } = await import("../../server/client-ip.ts");
const { writeLimiter } = await import("../../server/limits.ts");
const { session } = await import("../../server/session.ts");

const routes = [
  guestLogin,
  logout,
  callback,
  defineRoute({
    method: "get",
    path: "/api/test/private",
    summary: "behind requireUser",
    auth: true,
    responses: { 200: z.object({}) },
    handler: async () => reply(200, {}),
  }),
  defineRoute({
    method: "post",
    path: "/api/test/members-only",
    summary: "a handler that refuses",
    auth: true,
    body: z.object({ note: z.string() }),
    responses: { 403: z.object({ error: z.string() }) },
    handler: async () => reply(403, { error: "not a member of this pack" }),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/limited",
    summary: "behind a limiter",
    auth: false,
    limit: writeLimiter,
    responses: { 200: z.object({}) },
    handler: async () => reply(200, {}),
  }),
];

let server: Server;
let base: string;
let log: MockInstance<typeof console.log>;

beforeAll(async () => {
  const app = express();
  applyTrustProxy(app, 2);
  app.use(session);
  app.use(express.json());
  app.use(csrf);
  app.use(buildRouter(routes));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(() => server.close());

beforeEach(() => {
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

interface Event {
  type: string;
  event: string;
  route: string;
  ip: string;
  userId: number | null;
  requestId: string;
  reason?: string;
  at: string;
}

const lines = () => log.mock.calls.map((call) => String(call[0]));
const events = () =>
  lines()
    .map((line) => JSON.parse(line) as Event)
    .filter((entry) => entry.type === "security");

/* A browser's worth of state: cookies kept, the CSRF token echoed. */
function visitor(forwardedFor = "203.0.113.7, 172.70.1.1") {
  const jar = new Map<string, string>();
  const call = async (
    path: string,
    init: { method?: string; body?: unknown; csrf?: boolean } = {},
  ) => {
    const headers: Record<string, string> = {
      "x-forwarded-for": forwardedFor,
      "cf-ray": "8f2c1d3e4a5b6c7d-AMM",
      cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    const token = jar.get("XSRF-TOKEN");
    if (init.csrf !== false && token) {
      headers["x-xsrf-token"] = decodeURIComponent(token);
    }
    const res = await fetch(base + path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? null : JSON.stringify(init.body),
      redirect: "manual",
    });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const [name = "", ...value] = pair.split("=");
      jar.set(name, value.join("="));
    }
    return res;
  };
  return { call, jar };
}

async function signedIn() {
  const v = visitor();
  await v.call("/api/test/limited");
  const res = await v.call("/api/auth/guest", { method: "POST", body: {} });
  expect(res.status).toBe(201);
  return v;
}

describe("security events", () => {
  it("records a 401 from requireUser, with the resolved client address", async () => {
    const res = await visitor("10.6.6.6, 203.0.113.7, 172.70.1.1").call(
      "/api/test/private?token=query-secret",
    );
    expect(res.status).toBe(401);
    const [event] = events();
    expect(event).toMatchObject({
      type: "security",
      event: "auth.required",
      route: "GET /api/test/private",
      // What Cloudflare appended, not what the caller forged in front of it.
      ip: "203.0.113.7",
      userId: null,
      requestId: "8f2c1d3e4a5b6c7d-AMM",
    });
    expect(Date.parse(event?.at ?? "")).not.toBeNaN();
  });

  it("makes up a request id rather than trusting a malformed one", async () => {
    const res = await fetch(`${base}/api/test/private`, {
      headers: { "cf-ray": 'x","event":"forged' },
    });
    expect(res.status).toBe(401);
    expect(events()[0]?.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(events()).toHaveLength(1);
  });

  it("records a guest account being created, and the sign-out", async () => {
    const v = await signedIn();
    expect(events().map((e) => [e.event, e.userId])).toContainEqual([
      "guest.created",
      41,
    ]);
    const out = await v.call("/api/auth/logout", { method: "POST" });
    expect(out.status).toBe(204);
    expect(events().map((e) => [e.event, e.userId])).toContainEqual([
      "auth.logout",
      41,
    ]);
  });

  it("records a handler's 403 as an authorisation denial", async () => {
    const v = await signedIn();
    const res = await v.call("/api/test/members-only", {
      method: "POST",
      body: { note: "body-secret victim@example.com" },
    });
    expect(res.status).toBe(403);
    expect(events().at(-1)).toMatchObject({
      event: "authz.denied",
      route: "POST /api/test/members-only",
      userId: 41,
    });
  });

  it("records a CSRF rejection, and answers it as JSON", async () => {
    const v = await signedIn();
    const res = await v.call("/api/test/members-only", {
      method: "POST",
      body: { note: "forged" },
      csrf: false,
    });
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(events().at(-1)).toMatchObject({
      event: "csrf.rejected",
      userId: 41,
    });
  });

  it("records a rate limit firing", async () => {
    const v = visitor("198.51.100.200, 172.70.1.1");
    let status = 200;
    for (let i = 0; i < 101 && status === 200; i += 1) {
      status = (await v.call("/api/test/limited")).status;
    }
    expect(status).toBe(429);
    expect(events().at(-1)).toMatchObject({
      event: "rate_limit.hit",
      route: "GET /api/test/limited",
      ip: "198.51.100.200",
    });
  });

  it("records a failed provider sign-in by reason, without the callback's query", async () => {
    const res = await visitor().call(
      "/api/auth/oidc/callback?code=authorization-code-secret&state=state-secret",
    );
    expect(res.status).toBe(302);
    const event = events().at(-1);
    expect(event?.event).toBe("oidc.failed");
    expect(event?.route).toBe("GET /api/auth/oidc/callback");
    expect(["not-configured", "expired"]).toContain(event?.reason);
  });

  it("never writes a cookie, a token, an address, a body or a query string", async () => {
    const v = await signedIn();
    await v.call("/api/test/members-only", {
      method: "POST",
      body: { note: "body-secret victim@example.com" },
    });
    await v.call("/api/test/members-only", {
      method: "POST",
      body: { note: "body-secret" },
      csrf: false,
    });
    await v.call("/api/auth/oidc/callback?code=authorization-code-secret");
    await visitor().call("/api/test/private?token=query-secret");
    await v.call("/api/auth/logout", { method: "POST" });

    expect(events().length).toBeGreaterThanOrEqual(5);
    const written = lines().join("\n");
    const secrets = [
      "body-secret",
      "query-secret",
      "authorization-code-secret",
      "guest-secret-address",
      ...[...v.jar.values()].filter((value) => value.length > 8),
      ...[...v.jar.values()].map((value) => decodeURIComponent(value)),
    ].filter((value) => value.length > 8);
    for (const secret of secrets) expect(written).not.toContain(secret);
    expect(written).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);

    // And the shape is closed: nothing rides along by accident.
    const allowed = [
      "type",
      "event",
      "route",
      "ip",
      "userId",
      "requestId",
      "reason",
      "at",
    ];
    for (const event of events()) {
      expect(
        Object.keys(event).filter((key) => !allowed.includes(key)),
      ).toEqual([]);
    }
  });
});
