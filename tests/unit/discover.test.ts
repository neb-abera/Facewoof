/*
 * The discover handler's decisions, with the database stubbed out.
 *
 * What the feed returns is pinned against a real database in
 * tests/e2e/discover.spec.ts. What cannot be seen from outside is how many
 * round trips a page costs: the handler used to look up the searcher's own
 * location on every request, to settle a question - which Hoboken? - that a
 * zip code never asks, and then ran the feed's predicate twice, once to page
 * and once to count.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getUserLocation: vi.fn(),
  discoverFeedPage: vi.fn(),
  setRelationship: vi.fn(),
  checkForMatchAndCreate: vi.fn(),
}));
vi.mock("../../server/db/index.ts", () => db);

const { discoverUsers, needsOrigin, resolveZip, userResponse } = await import(
  "../../server/controllers/discover.ts"
);

const call = (body: { zipcode: string; seen?: string; limit?: number }) =>
  discoverUsers.handler({
    userId: 7,
    body,
    query: undefined,
    session: {} as never,
    clearSession: () => {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.getUserLocation.mockResolvedValue("10011");
  db.discoverFeedPage.mockResolvedValue({ users: [], remaining: 0 });
});

describe("a page of the feed", () => {
  it("costs one query when the search is a zip code", async () => {
    const res = await call({ zipcode: "60601", seen: "3, 4,x,-1", limit: 99 });

    expect(db.getUserLocation).not.toHaveBeenCalled();
    expect(db.discoverFeedPage).toHaveBeenCalledTimes(1);
    const [userId, zips, limit, seen] = db.discoverFeedPage.mock.calls[0] ?? [];
    expect(userId).toBe(7);
    expect(zips).toContain("60601");
    // The page size is capped, and `seen` keeps only what is an id.
    expect(limit).toBe(30);
    expect(seen).toEqual([3, 4]);
    expect(res).toMatchObject({
      status: 200,
      body: { origin: "60601", users: [], remaining: 0 },
    });
  });

  it("skips the lookup for a city with its state, too", async () => {
    await call({ zipcode: "Chicago, IL" });
    expect(db.getUserLocation).not.toHaveBeenCalled();
  });

  it("asks where the searcher is only to settle a bare city name", async () => {
    const res = await call({ zipcode: "Hoboken" });
    expect(db.getUserLocation).toHaveBeenCalledWith(7);
    // From Manhattan, Hoboken is the one in New Jersey, not Georgia.
    expect(res).toMatchObject({ status: 200, body: { origin: "07030" } });
  });

  it("passes on the count the query made, and refuses nowhere", async () => {
    db.discoverFeedPage.mockResolvedValue({
      users: [{ user_id: 9 }],
      remaining: 41,
    });
    expect(await call({ zipcode: "60601" })).toMatchObject({
      body: { users: [{ user_id: 9 }], remaining: 41 },
    });

    expect(await call({ zipcode: "00000" })).toMatchObject({ status: 400 });
    expect(await call({ zipcode: "Nowhereville" })).toMatchObject({
      status: 400,
    });
  });
});

describe("needsOrigin agrees with resolveZip about when nearZip is read", () => {
  it.each([
    ["60601", false],
    [" 60601 ", false],
    ["Chicago, IL", false],
    ["", false],
    ["Hoboken", true],
    // A trailing comma leaves no state, so it is still a bare city.
    ["Hoboken,", true],
  ])("%j -> %s", (query, expected) => {
    expect(needsOrigin(query)).toBe(expected);
  });

  it("a bare city falls back to the largest place with no origin", () => {
    expect(resolveZip("Hoboken", "10011")).toBe("07030");
    expect(resolveZip("Hoboken,", "10011")).toBe("07030");
    expect(resolveZip("Hoboken", null)).toMatch(/^\d{5}$/);
    expect(resolveZip("   ", null)).toBeNull();
  });
});

describe("a swipe", () => {
  const swipe = (body: {
    otherUserId: number;
    currentUserChoice: boolean;
    otherUserChoice?: boolean | null;
  }) =>
    userResponse.handler({
      userId: 7,
      body,
      query: undefined,
      session: {} as never,
      clearSession: () => {},
    });

  it("on yourself is refused", async () => {
    expect(
      await swipe({ otherUserId: 7, currentUserChoice: true }),
    ).toMatchObject({ status: 400 });
    expect(db.setRelationship).not.toHaveBeenCalled();
  });

  it("is recorded when it is not reciprocated, and a match when it is", async () => {
    expect(
      await swipe({ otherUserId: 9, currentUserChoice: true }),
    ).toMatchObject({ status: 201 });
    expect(db.setRelationship).toHaveBeenCalledWith(7, 9, true);

    expect(
      await swipe({
        otherUserId: 9,
        currentUserChoice: true,
        otherUserChoice: true,
      }),
    ).toMatchObject({ status: 200, body: { matchedUserId: 9 } });
    expect(db.checkForMatchAndCreate).toHaveBeenCalledWith(7, 9);
  });
});
