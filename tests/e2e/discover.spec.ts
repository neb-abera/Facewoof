import { type APIRequestContext, expect, test } from "@playwright/test";

/*
 * The discover feed's contract, through the API a browser uses.
 *
 * The feed is one SQL query, and everything a visitor notices about it is
 * decided there: who comes first, how many are left, that no dog is dealt
 * twice and none is skipped. None of that is visible to a unit test without a
 * database, so it is pinned here against the real one - written before the
 * query was reworked (photos aggregated after LIMIT rather than for the whole
 * table, the count taken in the same pass rather than by a second query), so
 * the rework had something to hold still against.
 *
 * Kept to a handful of requests: the feed limiter allows sixty a minute per
 * address, and the whole suite arrives from one.
 */

interface Card {
  user_id: number;
  user1_choice: boolean | null;
  photos: string[] | null;
  location: string | null;
}
interface FeedPage {
  users: Card[];
  remaining: number;
  origin: string;
  distances: Record<string, number | null>;
}

/* A fresh demo account at `zip`, and the header its writes need. */
async function demo(request: APIRequestContext, zip: string) {
  await request.get("/api/auth/providers");
  const { cookies } = await request.storageState();
  const token = cookies.find((c) => c.name === "XSRF-TOKEN");
  const headers = {
    "x-xsrf-token": token ? decodeURIComponent(token.value) : "",
  };
  const guest = await request.post("/api/auth/guest", {
    headers,
    data: { zip },
  });
  expect(guest.status()).toBe(201);

  const feed = async (data: Record<string, unknown>): Promise<FeedPage> => {
    const res = await request.post("/api/discover", { headers, data });
    expect(res.status(), await res.text()).toBe(200);
    return res.json();
  };
  return { headers, feed, me: (await guest.json()).user_id as number };
}

const ids = (page: FeedPage) => page.users.map((u) => u.user_id);

test("admirers come first, then everyone else, each in id order", async ({
  request,
}) => {
  const { feed } = await demo(request, "60601");
  const page = await feed({ zipcode: "60601", radius: 25, limit: 30 });

  expect(page.origin).toBe("60601");
  expect(page.users).toHaveLength(30);

  // A demo account arrives with six dogs that have already swiped yes.
  const admirers = page.users.filter((u) => u.user1_choice === true);
  expect(admirers).toHaveLength(6);
  expect(page.users.slice(0, 6)).toEqual(admirers);

  const ascending = (list: number[]) =>
    list.every((id, i) => i === 0 || id > (list[i - 1] ?? 0));
  expect(ascending(admirers.map((u) => u.user_id))).toBe(true);
  expect(ascending(page.users.slice(6).map((u) => u.user_id))).toBe(true);
  // Anyone who has not swiped is null, not false: a false would be a dog who
  // passed, and those are not dealt at all.
  for (const u of page.users.slice(6)) expect(u.user1_choice).toBeNull();

  // Every card comes with its own photos, in a stable order, and every zip a
  // card is in has a distance.
  for (const u of page.users) {
    expect(u.photos?.length, `dog ${u.user_id} has photos`).toBeGreaterThan(0);
    expect(page.distances).toHaveProperty(String(u.location));
  }
  const again = await feed({ zipcode: "60601", radius: 25, limit: 30 });
  expect(again.users).toEqual(page.users);
  expect(again.remaining).toBe(page.remaining);
});

test("pages deal every dog exactly once, and count down to zero", async ({
  request,
}) => {
  const { feed } = await demo(request, "60601");
  const search = { zipcode: "60601", radius: 25 };

  const first = await feed({ ...search, limit: 30 });
  const total = first.users.length + first.remaining;
  expect(first.remaining).toBeGreaterThan(30);

  // A smaller page is the head of a larger one, and leaves more behind.
  const small = await feed({ ...search, limit: 10 });
  expect(ids(small)).toEqual(ids(first).slice(0, 10));
  expect(small.remaining).toBe(total - 10);

  const dealt = ids(first);
  let remaining = first.remaining;
  while (remaining > 0) {
    const page = await feed({ ...search, limit: 30, seen: dealt.join(",") });
    expect(page.users.length).toBe(Math.min(30, remaining));
    expect(page.remaining).toBe(remaining - page.users.length);
    dealt.push(...ids(page));
    remaining = page.remaining;
    expect(dealt.length, "the loop is bounded").toBeLessThanOrEqual(total);
  }
  expect(dealt).toHaveLength(total);
  expect(new Set(dealt).size, "no dog was dealt twice").toBe(total);

  // A full page can still be the last one: remaining is counted, not
  // inferred from a short page.
  const lastFive = await feed({
    ...search,
    limit: 5,
    seen: dealt.slice(0, total - 5).join(","),
  });
  expect(lastFive.users).toHaveLength(5);
  expect(lastFive.remaining).toBe(0);

  // And with everything seen the page is empty and nothing is left.
  const none = await feed({ ...search, limit: 10, seen: dealt.join(",") });
  expect(none.users).toEqual([]);
  expect(none.remaining).toBe(0);
});

test("a pass removes the dog and the count follows; nowhere is an empty page", async ({
  request,
}) => {
  const { feed, headers } = await demo(request, "60601");
  const search = { zipcode: "60601", radius: 25, limit: 10 };

  const before = await feed(search);
  const passed = before.users[0];
  const other = before.users[6];
  if (!passed || !other) throw new Error("the demo feed is too short");

  // Passing on an admirer and on a stranger: both leave the feed.
  for (const dog of [passed, other]) {
    const swipe = await request.post("/api/response", {
      headers,
      data: {
        otherUserId: dog.user_id,
        currentUserChoice: false,
        otherUserChoice: dog.user1_choice,
      },
    });
    expect(swipe.status()).toBe(201);
  }

  const after = await feed(search);
  expect(ids(after)).not.toContain(passed.user_id);
  expect(ids(after)).not.toContain(other.user_id);
  expect(after.users.length + after.remaining).toBe(
    before.users.length + before.remaining - 2,
  );

  // Nobody lives within a mile of the middle of Yellowstone.
  const empty = await feed({ zipcode: "82190", radius: 1, limit: 10 });
  expect(empty.users).toEqual([]);
  expect(empty.remaining).toBe(0);
});

test("a bare city name resolves nearest the searcher; a zip needs no help", async ({
  request,
}) => {
  // Hoboken exists in New Jersey and in Georgia. From Manhattan it is the
  // one across the river, which only the searcher's own location can settle.
  const { feed, headers } = await demo(request, "10011");
  const hoboken = await feed({ zipcode: "Hoboken", radius: 1, limit: 1 });
  expect(hoboken.origin).toBe("07030");

  const withState = await feed({ zipcode: "Chicago, IL", radius: 1, limit: 1 });
  expect(withState.origin).toMatch(/^60\d{3}$/);

  const zip = await feed({ zipcode: "60601", radius: 1, limit: 1 });
  expect(zip.origin).toBe("60601");

  const res = await request.post("/api/discover", {
    headers,
    data: { zipcode: "00000" },
  });
  expect(res.status()).toBe(400);
});
