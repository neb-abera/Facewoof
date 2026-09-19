/*
 * The route table itself, server/routes.ts: what every entry must declare,
 * and that the table as mounted behaves the way its declarations say.
 *
 * The unit tests elsewhere build small tables of their own, so nothing
 * checked the real one. Two things must hold for every route. It says
 * whether it needs a signed-in user — a field the type requires, restated
 * as a test because a cast or a spread can still leave it undefined — and
 * if it does not, it carries a rate limiter of its own rather than leaning
 * on the /api backstop, which exists to catch a route added without one,
 * not to be one. Then the real table goes into the real app and every route
 * behind `auth` is asked for without a session: each must answer 401 before
 * its handler runs.
 *
 * The checker is a function so that the same code can be shown to fail: a
 * table with an undeclared route, an anonymous route with no limiter, and a
 * route declared twice must each be reported, or a green run means nothing.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AnyRoute } from "../../server/api/route.ts";
import type { Api } from "./helpers/api-harness.ts";

// The table, not the database. Every handler is imported and none is run:
// a caller with no session is turned away by requireUser first, and the
// providers route reads no table. So the database layer is stood in for by
// nothing at all, and a route that did reach its handler here would fail on
// its first query, which is the point. (Importing the real layer would also
// put every SQL module into the coverage count as never-run code; that
// layer is proven against Postgres in tests/db.)
vi.mock("../../server/db/index.ts", () => ({}));
vi.mock("../../server/db/sessions.ts", () => ({}));
// Likewise the Entra client, which only the providers route reads here and
// only for whether it is configured: the answer an instance with no tenant
// gives. The client itself is exercised against tests/oidc-mock in the
// browser suite.
vi.mock("../../server/oidc.ts", () => ({ isConfigured: false, PROVIDERS: {} }));
// The guest limiter counts in Postgres; here it counts in memory. Nothing
// below reaches it, but importing the real table constructs it.
vi.mock(
  "../../server/rate-limit-store.ts",
  () => import("./helpers/memory-rate-limit-store.ts"),
);

const { routes } = await import("../../server/routes.ts");
const { PUBLIC_LIMIT_PER_MINUTE } = await import("../../server/limits.ts");
const { startApi } = await import("./helpers/api-harness.ts");

const nameOf = (route: AnyRoute) =>
  `${route.method.toUpperCase()} ${route.path}`;

/* The findings for a table, one sentence per defect naming the route. */
function auditRouteTable(table: readonly AnyRoute[]): string[] {
  const findings: string[] = [];
  const declared = new Set<string>();
  for (const route of table) {
    const name = nameOf(route);
    if (typeof route.auth !== "boolean") {
      findings.push(`${name} does not say whether it needs a signed-in user`);
    }
    if (route.auth === false && route.limit === undefined) {
      findings.push(`${name} is anonymous and has no rate limiter of its own`);
    }
    if (declared.has(name)) findings.push(`${name} is declared twice`);
    declared.add(name);
  }
  return findings;
}

describe("the checker", () => {
  const sound: AnyRoute = {
    method: "get",
    path: "/api/x",
    summary: "a route with nothing wrong",
    auth: true,
    responses: { 204: null },
    handler: async () => ({ status: 204 }),
  };

  it("passes a sound table", () => {
    expect(auditRouteTable([sound])).toEqual([]);
  });

  it("reports an undeclared route, an unlimited anonymous route and a duplicate, by name", () => {
    // What a spread or a cast can produce: the type says boolean, the value
    // is not one.
    const undeclared = {
      ...sound,
      path: "/api/z",
      auth: undefined,
    } as unknown as AnyRoute;
    const unlimited: AnyRoute = { ...sound, path: "/api/y", auth: false };

    expect(auditRouteTable([undeclared, unlimited, sound, sound])).toEqual([
      "GET /api/z does not say whether it needs a signed-in user",
      "GET /api/y is anonymous and has no rate limiter of its own",
      "GET /api/x is declared twice",
    ]);
  });
});

describe("server/routes.ts", () => {
  it("declares auth on every route and a limiter on every anonymous one", () => {
    expect(auditRouteTable(routes)).toEqual([]);
  });
});

describe("the real table in the real app", () => {
  let api: Api;
  beforeAll(async () => {
    api = await startApi(routes);
  });
  afterAll(() => api.close());

  const guarded = routes.filter((route) => route.auth);

  it("has routes behind auth to check", () => {
    expect(guarded.length).toBeGreaterThan(0);
  });

  it.each(guarded.map((route) => [nameOf(route), route] as const))(
    "%s answers 401 to a caller with no session",
    async (_, route) => {
      // Every path is literal, so it can be requested exactly as declared.
      expect(route.path).not.toContain(":");
      const res = await api
        .visitor()
        .call(route.path, { method: route.method.toUpperCase() });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "sign in first" });
    },
  );

  /*
   * The three routes that used to lean on the /api backstop, each with a
   * bucket of its own. What each answers an anonymous caller with no Entra
   * tenant configured: the provider list, a sign-out of nobody, and the
   * callback's redirect to the login page with a reason.
   */
  const anonymous = [
    ["GET", "/api/auth/providers", 200],
    ["POST", "/api/auth/logout", 204],
    ["GET", "/api/auth/oidc/callback", 302],
  ] as const;

  it.each(anonymous.map((route, i) => [...route, i] as const))(
    `%s %s refuses the request after the ${PUBLIC_LIMIT_PER_MINUTE}th in a minute from one address, and the other two still answer`,
    async (method, path, expected, index) => {
      // Buckets are per address, so each case gets an address of its own
      // and nothing here depends on the order the cases run in.
      const v = api.visitor(`198.51.100.${index + 1}`);
      // Sign-out drops the session, and with it the CSRF secret, the way a
      // real sign-out does; a browser then reloads and fetches a fresh token
      // (src/api.ts). Do the same before every attempt, so what is measured
      // is the limiter and not a stale token.
      const send = async (m: string, p: string) => {
        await v.call("/api/test/csrf");
        return v.call(p, { method: m });
      };

      for (let i = 1; i <= PUBLIC_LIMIT_PER_MINUTE; i++) {
        const res = await send(method, path);
        expect(res.status, `${path} request ${i}`).toBe(expected);
      }
      const refused = await send(method, path);
      expect(refused.status).toBe(429);
      expect(await refused.json()).toEqual({ error: expect.any(String) });

      // The same address, the other two routes: a burst on one — the token
      // source, say — cannot take sign-out or sign-in completion with it.
      for (const [otherMethod, otherPath, otherExpected] of anonymous) {
        if (otherPath === path) continue;
        const res = await send(otherMethod, otherPath);
        expect(res.status, otherPath).toBe(otherExpected);
      }
    },
  );
});
