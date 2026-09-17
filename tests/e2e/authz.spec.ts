import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  expect,
  test,
} from "@playwright/test";

/*
 * Who may see and do what, asked over HTTP the way an attacker would.
 *
 * Every test here signs in one or two throwaway demo accounts and talks to
 * the API directly: the browser client never sends these requests, which is
 * exactly why nothing noticed the server honouring them. Each was a working
 * attack on main when it was written.
 */

interface Account {
  context: BrowserContext;
  api: APIRequestContext;
  headers: Record<string, string>;
  userId: number;
}

interface Card {
  user_id: number;
  user1_choice: boolean | null;
}

/* The CSRF token cookie, whichever name this instance gives it. */
async function csrfToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const token = cookies.find((c) => c.name.endsWith("XSRF-TOKEN"));
  return token ? decodeURIComponent(token.value) : "";
}

async function demoAccount(browser: Browser): Promise<Account> {
  const context = await browser.newContext();
  const api = context.request;
  // Any page sets the CSRF cookie the sign-in POST has to echo.
  await api.get("/");
  const headers = { "x-xsrf-token": await csrfToken(context) };
  const res = await api.post("/api/auth/guest", {
    headers,
    data: { zip: "10011" },
  });
  expect(res.status(), "demo sign-in").toBe(201);
  const { user_id: userId } = (await res.json()) as { user_id: number };
  return { context, api, headers, userId };
}

async function feed(account: Account): Promise<Card[]> {
  const res = await account.api.post("/api/discover", {
    headers: account.headers,
    data: { zipcode: "10011", radius: 25, limit: 30 },
  });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { users: Card[] }).users;
}

async function friendIds(account: Account): Promise<number[]> {
  const res = await account.api.get("/api/friends");
  expect(res.status()).toBe(200);
  return ((await res.json()) as { user_id: number }[]).map((f) => f.user_id);
}

async function packs(account: Account) {
  const res = await account.api.get("/api/getpacks");
  expect(res.status()).toBe(200);
  return (await res.json()) as { pack_id: number; name: string }[];
}

/* A pack only `owner` (and one of their friends) belongs to. */
async function privatePack(owner: Account, name: string): Promise<number> {
  const [friend] = await friendIds(owner);
  expect(friend, "the demo seeds a few matches").toBeDefined();
  const res = await owner.api.put("/api/createpack", {
    headers: owner.headers,
    data: { pack_name: name, users: [friend] },
  });
  expect(res.status(), "a pack with a friend is allowed").toBe(201);
  const pack = (await packs(owner)).find((p) => p.name === name);
  if (!pack) throw new Error("the new pack is not in its creator's list");
  return pack.pack_id;
}

const unique = (label: string) =>
  `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test("nothing the API says about another member carries their email or zip code", async ({
  browser,
}) => {
  const me = await demoAccount(browser);

  const discover = await me.api.post("/api/discover", {
    headers: me.headers,
    data: { zipcode: "10011", radius: 25, limit: 30 },
  });
  const page = (await discover.json()) as {
    users: Record<string, unknown>[];
  };
  expect(page.users.length).toBeGreaterThan(0);

  const friends = await me.api.get("/api/friends");
  const posts = await me.api.get("/api/getAllPacksPostsForUser");
  const playdates = await me.api.get("/api/playdates");

  for (const [name, res] of Object.entries({
    discover,
    friends,
    posts,
    playdates,
  })) {
    const text = await res.text();
    expect(text, `${name} must not name an email field`).not.toContain(
      "owner_email",
    );
    // Photo URLs have no @; an address anywhere in the body does.
    expect(text, `${name} must not contain an address`).not.toMatch(
      /[\w.+-]+@[\w-]+\.[\w.]+/,
    );
  }

  // A card says how far away the dog is, and not where it lives.
  for (const card of page.users) {
    expect(card).not.toHaveProperty("location");
    expect(card).toHaveProperty("distance");
  }
  expect(page).not.toHaveProperty("distances");
  for (const friend of (await friends.json()) as Record<string, unknown>[]) {
    expect(friend).not.toHaveProperty("location");
  }

  // The caller's own account is the one place the address still appears.
  const own = (await (await me.api.get("/api/auth/me")).json()) as {
    owner_email: string;
  };
  expect(own.owner_email).toContain("@");

  await me.context.close();
});

test("a playdate can only be put on the calendar of a pack you belong to", async ({
  browser,
}) => {
  const owner = await demoAccount(browser);
  const outsider = await demoAccount(browser);
  const packId = await privatePack(owner, unique("Members only"));
  const body = unique("gatecrash");

  const refused = await outsider.api.post("/api/addplaydate", {
    headers: outsider.headers,
    data: {
      packId,
      playdateBody: body,
      startTime: "2030-01-01T10:00:00.000Z",
      endTime: "2030-01-01T11:00:00.000Z",
    },
  });
  expect(refused.status(), "not a member, no playdate").toBe(403);

  const calendar = await (await owner.api.get("/api/playdates")).text();
  expect(calendar, "nothing was written").not.toContain(body);

  // And a member still can.
  const allowed = await owner.api.post("/api/addplaydate", {
    headers: owner.headers,
    data: {
      packId,
      playdateBody: unique("real"),
      startTime: "2030-01-01T10:00:00.000Z",
      endTime: "2030-01-01T11:00:00.000Z",
    },
  });
  expect(allowed.status()).toBe(201);

  await owner.context.close();
  await outsider.context.close();
});

test("a match cannot be claimed by telling the server the other dog said yes", async ({
  browser,
}) => {
  const attacker = await demoAccount(browser);
  const victim = await demoAccount(browser);

  // A demo account is not discoverable: it cannot be swiped on at all.
  const hidden = await attacker.api.post("/api/response", {
    headers: attacker.headers,
    data: {
      otherUserId: victim.userId,
      currentUserChoice: true,
      otherUserChoice: true,
    },
  });
  expect(hidden.status(), "no such dog, as far as the caller knows").toBe(404);
  expect(await friendIds(attacker)).not.toContain(victim.userId);
  expect(await friendIds(victim)).not.toContain(attacker.userId);

  // A dog from the feed that has NOT swiped yes stays unmatched, whatever the
  // request claims about its choice.
  const cards = await feed(attacker);
  const stranger = cards.find((card) => card.user1_choice === null);
  if (!stranger) throw new Error("the demo feed has dogs that have not swiped");
  const forged = await attacker.api.post("/api/response", {
    headers: attacker.headers,
    data: {
      otherUserId: stranger.user_id,
      currentUserChoice: true,
      otherUserChoice: true,
    },
  });
  expect(forged.status(), "recorded as a swipe, not a match").toBe(201);
  expect(await friendIds(attacker)).not.toContain(stranger.user_id);

  // One that genuinely has is still a match.
  const admirer = cards.find((card) => card.user1_choice === true);
  if (!admirer) throw new Error("the demo seeds dogs that already like you");
  const real = await attacker.api.post("/api/response", {
    headers: attacker.headers,
    data: { otherUserId: admirer.user_id, currentUserChoice: true },
  });
  expect(real.status()).toBe(200);
  expect(await friendIds(attacker)).toContain(admirer.user_id);

  await attacker.context.close();
  await victim.context.close();
});
