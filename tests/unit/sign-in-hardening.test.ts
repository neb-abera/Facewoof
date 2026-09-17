/*
 * The smaller sign-in hardenings, over HTTP through the real routes: a
 * started provider sign-in goes stale, only a verified email is believed, an
 * email that already belongs to an account is refused rather than adopted,
 * and demo accounts have a ceiling. Plus the guest sweep, which has no HTTP
 * surface, against a recording pool.
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
  vi,
} from "vitest";

class EmailInUseError extends Error {}

const db = {
  EmailInUseError,
  countLiveGuests: vi.fn(async () => 0),
  createGuestUser: vi.fn(),
  getCurrentUserPromise: vi.fn(),
  findOrCreateExternalUser: vi.fn(
    async (_identity: { email: string | null }) => ({
      userId: 55,
      created: true,
    }),
  ),
};
vi.mock("../../server/db/index.ts", () => db);

// The guest limiter counts in Postgres; here it counts in memory.
vi.mock(
  "../../server/rate-limit-store.ts",
  () => import("./helpers/memory-rate-limit-store.ts"),
);

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

const claims = {
  iss: "https://login.example",
  sub: "subject-1",
  email: "sam@example.com",
  email_verified: true as boolean | undefined,
  preferred_username: "typed-by-the-user@example.com",
  name: "Sam",
};
vi.mock("../../server/oidc.ts", () => ({
  isConfigured: true,
  PROVIDERS: { email: { label: "Email", domainHint: null } },
  createAuthRequest: vi.fn(() => ({
    verifier: "v",
    challenge: "c",
    state: "the-state",
    nonce: "n",
    provider: "email",
  })),
  authorizeUrl: vi.fn(async () => "https://login.example/authorize"),
  exchangeCode: vi.fn(async () => ({ id_token: "t" })),
  verifyIdToken: vi.fn(async () => ({ ...claims })),
}));

const statements: { sql: string; params: unknown[] }[] = [];
let deleted: number[] = [];
vi.mock("../../server/db/database.ts", () => ({
  pool: {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      statements.push({ sql, params });
      if (sql.includes("count(*)")) return { rows: [{ n: 7 }] };
      return { rowCount: deleted.shift() ?? 0 };
    }),
  },
}));

const { buildRouter } = await import("../../server/api/express.ts");
const { guestLogin } = await import("../../server/controllers/auth.ts");
const { callback, start } = await import("../../server/controllers/oidc.ts");
const { countLiveGuests, purgeExpiredGuests } = await import(
  "../../server/db/guests.ts"
);
const { session } = await import("../../server/session.ts");

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(session);
  app.use(express.json());
  app.use(buildRouter([guestLogin, start, callback]));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(() => server.close());

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  claims.email_verified = true;
  statements.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  db.findOrCreateExternalUser.mockClear();
  db.createGuestUser.mockClear();
});

/* Start a sign-in and come back with the right state, cookies carried. */
async function signInThroughProvider(between: () => void = () => {}) {
  const started = await fetch(`${base}/api/auth/oidc/start`, {
    redirect: "manual",
  });
  const cookie = started.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  between();
  const back = await fetch(
    `${base}/api/auth/oidc/callback?code=abc&state=the-state`,
    { redirect: "manual", headers: { cookie } },
  );
  return back.headers.get("location");
}

describe("provider sign-in", () => {
  it("completes within the window", async () => {
    expect(await signInThroughProvider()).toBe("/discover");
  });

  it("refuses a callback for a sign-in started more than ten minutes ago", async () => {
    const location = await signInThroughProvider(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    });
    expect(location).toBe("/login?error=expired");
    expect(db.findOrCreateExternalUser).not.toHaveBeenCalled();
  });

  it("believes an email only when the provider says it verified it", async () => {
    await signInThroughProvider();
    expect(db.findOrCreateExternalUser.mock.calls[0]?.[0].email).toBe(
      "sam@example.com",
    );

    for (const unverified of [false, undefined]) {
      db.findOrCreateExternalUser.mockClear();
      claims.email_verified = unverified;
      expect(await signInThroughProvider()).toBe("/discover");
      // Not the claimed address, and not preferred_username either.
      expect(db.findOrCreateExternalUser.mock.calls[0]?.[0].email).toBeNull();
    }
  });

  it("refuses, rather than adopts, an account that already holds the email", async () => {
    db.findOrCreateExternalUser.mockRejectedValueOnce(new EmailInUseError());
    const location = await signInThroughProvider();
    expect(location).toBe("/login?error=email-in-use");
  });
});

describe("demo accounts", () => {
  it("are refused past the ceiling, before anything is written", async () => {
    db.countLiveGuests.mockResolvedValueOnce(1000);
    const res = await fetch(`${base}/api/auth/guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(503);
    expect(db.createGuestUser).not.toHaveBeenCalled();
    expect(res.headers.getSetCookie().join()).not.toContain("facewoof.sid=ey");
    const logged = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
    expect(logged.some((line) => line.includes('"guest.refused"'))).toBe(true);
  });

  it("are counted as accounts, not as the roster copies each one brings", async () => {
    expect(await countLiveGuests()).toBe(7);
    expect(statements[0]?.sql).toMatch(/is_guest AND demo_of IS NULL/);
  });

  it("are swept in batches that each commit, until a short batch says done", async () => {
    deleted = [2000, 2000, 5];
    const { rowCount } = await purgeExpiredGuests(24);
    expect(rowCount).toBe(4005);
    expect(statements).toHaveLength(3);
    for (const { sql, params } of statements) {
      expect(sql).toMatch(/LIMIT \$2/);
      expect(sql).toMatch(/SKIP LOCKED/);
      expect(params).toEqual([24, 2000]);
    }
  });

  it("stop sweeping when there is nothing left", async () => {
    deleted = [0];
    expect((await purgeExpiredGuests()).rowCount).toBe(0);
    expect(statements).toHaveLength(1);
  });
});
