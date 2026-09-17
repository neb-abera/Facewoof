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
