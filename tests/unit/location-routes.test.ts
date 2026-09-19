/*
 * The three routes that turn a zip code or device coordinates into a place,
 * over HTTP, with the database stubbed out: moving an account
 * (PUT /api/location), finishing a signed-in account's setup
 * (PUT /api/onboarding), and asking which zip code a pair of coordinates is
 * (POST /api/resolve-location). Onboarding was reached only through the
 * Welcome form in the browser suite and resolve-location only as a URL that
 * suite waited for; neither had a test of its own.
 *
 * None of the three takes an id: the account moved or set up is the
 * session's, whatever the body names.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Api } from "./helpers/api-harness.ts";

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

const db = vi.hoisted(() => ({
  db: { connect: vi.fn() },
  ensureNeighbours: vi.fn(),
  completeOnboarding: vi.fn(),
}));
vi.mock("../../server/db/index.ts", () => db);

const { updateLocation } = await import("../../server/controllers/profile.ts");
const { finish } = await import("../../server/controllers/onboarding.ts");
const { resolveLocation } = await import(
  "../../server/controllers/discover.ts"
);
const { startApi } = await import("./helpers/api-harness.ts");

/* The one pooled connection updateLocation's transaction runs on. */
const client = {
  query: vi.fn<(text: string, values?: unknown[]) => Promise<unknown>>(
    async () => ({ rows: [], rowCount: 1 }),
  ),
  release: vi.fn(),
};

const chicago = { lat: 41.8781, lng: -87.6298 };

let api: Api;
beforeAll(async () => {
  api = await startApi([updateLocation, finish, resolveLocation]);
});
afterAll(() => api.close());

beforeEach(() => {
  vi.clearAllMocks();
  db.db.connect.mockResolvedValue(client);
  db.ensureNeighbours.mockResolvedValue(12);
  db.completeOnboarding.mockResolvedValue({ nearby: 9 });
});

/* The statements the transaction ran, by their first word. */
const statements = () =>
  client.query.mock.calls.map((call) => String(call[0]).split(" ")[0]);

describe("PUT /api/location", () => {
  const put = (v: Awaited<ReturnType<Api["signedInAs"]>>, body: unknown) =>
    v.call("/api/location", { method: "PUT", body });

  it("answers 401 with no session", async () => {
    const res = await put(api.visitor(), { zip: "60601" });
    expect(res.status).toBe(401);
    expect(db.db.connect).not.toHaveBeenCalled();
  });

  it("is a 400 naming the field for coordinates off the globe", async () => {
    const me = await api.signedInAs(7);
    const res = await put(me, { lat: 91, lng: 0 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("invalid request body");
    expect(body.issues[0]).toMatch(/^lat: /);
    expect(db.db.connect).not.toHaveBeenCalled();
  });

  it("is a 400 for a zip code that is not one, and for nothing at all", async () => {
    const me = await api.signedInAs(7);
    for (const body of [{ zip: "00000" }, {}]) {
      const res = await put(me, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(await res.json()).toEqual({
        error: "a usable zip code or pair of coordinates is required",
      });
    }
    expect(db.db.connect).not.toHaveBeenCalled();
  });

  it("moves the caller's own account, in one transaction, whatever id the body names", async () => {
    const me = await api.signedInAs(7);
    const res = await put(me, { zip: "60601", userId: 8, user_id: 8 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ location: "60601", nearby: 12 });

    expect(statements()).toEqual(["BEGIN", "UPDATE", "COMMIT"]);
    expect(client.query).toHaveBeenCalledWith(
      "UPDATE users SET location = $2 WHERE user_id = $1",
      [7, "60601"],
    );
    expect(db.ensureNeighbours).toHaveBeenCalledWith(client, 7, "60601");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("falls back to the device's coordinates when the zip code is unusable", async () => {
    const me = await api.signedInAs(7);
    const res = await put(me, { zip: "00000", ...chicago });
    expect(res.status).toBe(200);
    const { location } = (await res.json()) as { location: string };
    expect(location).toMatch(/^606\d\d$/);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/^UPDATE/),
      [7, location],
    );
  });

  it("rolls back and answers 500 when the top-up fails, and still returns the connection", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    db.ensureNeighbours.mockRejectedValueOnce(new Error("no room"));
    const me = await api.signedInAs(7);
    const res = await put(me, { zip: "60601" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal error" });
    expect(statements()).toEqual(["BEGIN", "UPDATE", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});

describe("PUT /api/onboarding", () => {
  const put = (v: Awaited<ReturnType<Api["signedInAs"]>>, body: unknown) =>
    v.call("/api/onboarding", { method: "PUT", body });

  it("answers 401 with no session", async () => {
    const res = await put(api.visitor(), { dogName: "Rex" });
    expect(res.status).toBe(401);
    expect(db.completeOnboarding).not.toHaveBeenCalled();
  });

  it("is a 400 naming the field when the dog has no name", async () => {
    const me = await api.signedInAs(7);
    const res = await put(me, { dogName: "  ", zip: "60601" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "invalid request body",
      issues: ["dogName: a dog name is required"],
    });
    expect(db.completeOnboarding).not.toHaveBeenCalled();
  });

  it("sets up the caller's own account at the zip code given, whatever id the body names", async () => {
    const me = await api.signedInAs(7);
    const res = await put(me, {
      dogName: " Biscuit ",
      dogBreed: "",
      age: "3",
      vaccination: true,
      zip: "60601",
      userId: 8,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ location: "60601", nearby: 9 });
    expect(db.completeOnboarding).toHaveBeenCalledWith({
      userId: 7,
      dogName: "Biscuit",
      dogBreed: null,
      age: 3,
      vaccination: true,
      zip: "60601",
    });
  });

  it("takes the device's coordinates when there is no usable zip code", async () => {
    const me = await api.signedInAs(7);
    const res = await put(me, { dogName: "Rex", zip: "00000", ...chicago });
    expect(res.status).toBe(200);
    const { location } = (await res.json()) as { location: string };
    expect(location).toMatch(/^606\d\d$/);
    expect(db.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, zip: location }),
    );
  });

  it("needs no location at all: the feed falls back to a default city", async () => {
    const me = await api.signedInAs(7);
    for (const body of [{ dogName: "Rex" }, { dogName: "Rex", zip: "00000" }]) {
      const res = await put(me, body);
      expect(res.status, JSON.stringify(body)).toBe(200);
      expect(await res.json()).toEqual({ location: null, nearby: 9 });
    }
    expect(db.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        dogBreed: null,
        age: null,
        vaccination: null,
        zip: null,
      }),
    );
  });
});

describe("POST /api/resolve-location", () => {
  const post = (v: Awaited<ReturnType<Api["signedInAs"]>>, body: unknown) =>
    v.call("/api/resolve-location", { method: "POST", body });

  it("answers 401 with no session", async () => {
    expect((await post(api.visitor(), chicago)).status).toBe(401);
  });

  it("is a 400 naming the field for a coordinate that is not a number, or is missing", async () => {
    const me = await api.signedInAs(7);
    for (const body of [{ lat: "north", lng: 0 }, { lat: 41.8 }]) {
      const res = await post(me, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      const { issues } = (await res.json()) as { issues: string[] };
      expect(issues.join()).toMatch(/^l(at|ng): /);
    }
  });

  it("names the zip code, city and state nearest the coordinates", async () => {
    const me = await api.signedInAs(7);
    const res = await post(me, chicago);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      zip: expect.stringMatching(/^606\d\d$/),
      city: "Chicago",
      state: "IL",
    });
  });

  it("always names somewhere: the lookup has no distance cutoff, so the 404 it declares never fires", async () => {
    // zipcodes 8 returns the nearest code however far away it is. A pair of
    // coordinates in the southern Indian Ocean is still "near" some US zip
    // code, which is the behaviour a client gets today; pinned so that a
    // change to it is a deliberate one.
    const me = await api.signedInAs(7);
    const res = await post(me, { lat: -40, lng: 100 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      zip: expect.stringMatching(/^\d{5}$/),
    });
  });
});
