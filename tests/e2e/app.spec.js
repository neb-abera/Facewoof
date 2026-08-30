const { test, expect } = require("@playwright/test");

/*
 * The app beyond the demo's happy path.
 *
 * The first suite covered signing in and swiping. Everything here is something
 * that was reported broken by someone actually using the app, which is the
 * gap that suite left.
 */

/*
 * State-changing requests made straight through page.request need the CSRF
 * header the in-app client sends automatically; without it they would be
 * refused as forgeries before authorization is ever consulted, and the
 * permission tests below would pass for the wrong reason.
 */
async function csrfHeaders(page) {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === "XSRF-TOKEN");
  return { "x-xsrf-token": token ? decodeURIComponent(token.value) : "" };
}

async function signIn(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/discover", { timeout: 30_000 });
}

/*
 * Contrast, crudely but usefully.
 *
 * Parses whatever the browser reports and compares relative luminance. Not a
 * WCAG implementation — it is here to catch text rendered on a background of
 * nearly the same lightness, which is what "I can barely see it" means.
 */
async function contrastRatio(locator) {
  return locator.evaluate((el) => {
    const luminance = (c) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Walks up for the first non-transparent background, the way paint does.
    const parse = (str) => {
      // Painting one pixel resolves any colour syntax to sRGB bytes. Computed
      // colours are not reliably rgb(): color-mix(), which the stylesheets use
      // for translucent theme colours, computes to oklab(...), and reading
      // that with a number regex silently produced near-black. fillStyle
      // cannot be read back either — Chromium serialises it in the colour
      // space it was written in.
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = str;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) return null; // transparent: keep walking up for a background
      return [r, g, b];
    };
    const probe = document.createElement("span");
    probe.textContent = "x";
    el.appendChild(probe);
    const fg = getComputedStyle(probe).color;
    probe.remove();

    let node = el;
    let bg = null;
    while (node && !bg) {
      bg = parse(getComputedStyle(node).backgroundColor);
      node = node.parentElement;
    }
    const f = parse(fg);
    if (!f || !bg) return null;
    const l1 = luminance(f);
    const l2 = luminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
}

test("every page is reachable from every other page", async ({ page }) => {
  await signIn(page);

  // Regression: the navbar was position:static with no stacking context, so
  // its collapsed menu painted underneath the profile card and the links were
  // simply not clickable. The links existed; clicking them did nothing.
  const pages = ["/profile", "/calendar", "/packFeed", "/discover"];

  for (const target of pages) {
    const link = page.locator(`a[href="${target}"]:visible`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(target.replace("/", "\\/")), {
      timeout: 15_000,
    });
  }
});

test("nothing covers the navigation links", async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/profile"]:visible').first().click();
  await expect(page).toHaveURL(/\/profile/);

  // Whatever sits at the centre of the Discover link must be the link itself.
  // toBeVisible() passes for an element buried under another one.
  const covered = await page.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find(
      (a) => a.getAttribute("href") === "/discover" && a.offsetParent !== null,
    );
    if (!link) return "no visible Discover link";
    const r = link.getBoundingClientRect();
    const top = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    return top && (top === link || link.contains(top) || top.contains(link))
      ? null
      : `covered by ${top ? `${top.tagName}.${top.className}` : "nothing"}`;
  });
  expect(covered, `the Discover link is not clickable: ${covered}`).toBeNull();
});

test("the calendar is legible", async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 20_000 });

  // Regression: react-big-calendar ships a light stylesheet, so on the dark
  // theme the day headers were light grey on near-white and the toolbar
  // buttons were dark grey on near-black.
  for (const selector of [".rbc-header", ".rbc-toolbar button", ".rbc-label"]) {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) continue;
    const ratio = await contrastRatio(el);
    if (ratio === null) continue;
    expect(
      ratio,
      `${selector} contrast is ${ratio?.toFixed(2)}:1`,
    ).toBeGreaterThan(3);
  }
});

test("a playdate appears on the calendar after it is added", async ({
  page,
}) => {
  await signIn(page);
  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /add playdate/i }).click();
  const modal = page.locator(".app-modal");
  await expect(modal).toBeVisible();

  // Pick the first real pack and submit. The form opens with the next whole
  // hour already filled in, so a playdate takes one choice rather than typing
  // two full dates.
  await modal.locator("select").first().selectOption({ index: 1 });
  await modal.locator("textarea").fill("Playwright walk");
  await modal.getByRole("button", { name: /add playdate/i }).click();

  // Regression: the calendar only fetched on mount, so a playdate saved but
  // never appeared and the feature looked broken.
  await expect(modal).toBeHidden({ timeout: 15_000 });

  // The form defaults to the next whole hour, which crosses into the next
  // rbc week (or month) when this runs near a boundary - the default week
  // view then hides the new playdate and the test failed every Saturday
  // night UTC. The agenda view always starts at "now", so it shows the
  // playdate wherever the boundary put it.
  await page.getByRole("button", { name: "Agenda" }).click();
  await expect(page.getByText("Playwright walk").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("a transient API error does not sign the visitor out", async ({
  page,
}) => {
  await signIn(page);

  // Regression: the client cleared the session on any rejected request, so one
  // 429 or 500 logged the visitor out permanently. Only a 401 means the
  // account is actually gone.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 500, body: "boom" }),
  );
  await page.reload();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
});

test("a demo visitor lands on their profile, not an edit form", async ({
  page,
}) => {
  await signIn(page);
  await page.locator('a[href="/profile"]:visible').first().click();

  // Regression: signing in set firstLogin, which renders the edit form, so
  // every demo visitor met a form instead of the profile they came to see.
  await expect(page.getByText(/friends list/i)).toBeVisible({
    timeout: 20_000,
  });
});

/*
 * Modals.
 *
 * react-modal replaces its default content class when you pass className, so
 * the add-playdate form lost all positioning and opened against the top-left
 * corner. Its default overlay is also rgba(255,255,255,0.75) — a white wash
 * over a dark app.
 */
test("the add-playdate form opens centred, over a dark scrim", async ({
  page,
}) => {
  await signIn(page);
  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /add playdate/i }).click();

  const box = page.locator(".app-modal");
  await expect(box).toBeVisible();

  const geometry = await box.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const overlay = el.closest(".app-modal__overlay");
    return {
      centreX: r.left + r.width / 2,
      centreY: r.top + r.height / 2,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      withinViewport:
        r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight + 1,
      overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null,
    };
  });

  // Centred to within a tenth of the viewport on each axis.
  expect(Math.abs(geometry.centreX - geometry.viewportW / 2)).toBeLessThan(
    geometry.viewportW * 0.1,
  );
  expect(Math.abs(geometry.centreY - geometry.viewportH / 2)).toBeLessThan(
    geometry.viewportH * 0.1,
  );
  // Entirely on screen, rather than running off the bottom.
  expect(geometry.withinViewport, "the form is not fully on screen").toBe(true);

  // A dark scrim, not the library's white default.
  const scrim = geometry.overlayBg.match(/[\d.]+/g).map(Number);
  expect(
    scrim.slice(0, 3).reduce((a, b) => a + b) / 3,
    "the scrim is light",
  ).toBeLessThan(90);
});

test("the pack feed sidebar is legible", async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/packFeed"]:visible').first().click();

  // "Your Packs" was a bare div with no heading, padding or weight.
  const heading = page.getByText(/your packs/i).first();
  await expect(heading).toBeVisible({ timeout: 20_000 });

  const ratio = await contrastRatio(heading);
  if (ratio !== null)
    expect(ratio, `heading contrast is ${ratio?.toFixed(2)}:1`).toBeGreaterThan(
      4,
    );

  // The sidebar's actions have to be reachable, not clipped by a fixed height.
  const createPack = page.getByText(/create pack/i).first();
  await expect(createPack).toBeVisible();
  const clipped = await createPack.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.bottom > window.innerHeight ||
      r.right > window.innerWidth ||
      r.width === 0
    );
  });
  expect(clipped, "the Create Pack control is clipped out of view").toBe(false);
});

test("a pack can be created from the pack feed", async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/packFeed"]:visible').first().click();

  await page.getByRole("button", { name: /create pack/i }).click();

  // One dialog, not the three overlapping ones the checkbox-hack produced.
  const dialog = page.locator(".app-modal");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".app-modal")).toHaveCount(1);

  await dialog.locator(".create-pack__friend").first().click();
  await dialog.locator("input").fill("Playwright Pack");
  await dialog.getByRole("button", { name: /^create pack$/i }).click();

  await expect(dialog.getByText(/is ready/i)).toBeVisible({ timeout: 20_000 });
});

/*
 * The navigation bar at phone width.
 *
 * A guest carries two controls on the right — "Save your account" as well as
 * "Log out" — and below the small breakpoint those plus the wordmark ran into
 * each other, the same spilling the links were collapsed into a menu to avoid.
 */
test("the navbar does not overlap itself on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page);

  const overlap = await page.evaluate(() => {
    const box = (el) => el.getBoundingClientRect();
    const visible = (el) => el && el.offsetParent !== null;

    const controls = [
      ...document.querySelectorAll(".navbar a, .navbar button"),
    ].filter(visible);
    for (let i = 0; i < controls.length; i += 1) {
      for (let j = i + 1; j < controls.length; j += 1) {
        const a = box(controls[i]);
        const b = box(controls[j]);
        if (
          controls[i].contains(controls[j]) ||
          controls[j].contains(controls[i])
        )
          continue;
        const apart = a.right <= b.left + 1 || b.right <= a.left + 1;
        const stacked = a.bottom <= b.top + 1 || b.bottom <= a.top + 1;
        if (!apart && !stacked) {
          return `${controls[i].textContent.trim().slice(0, 20) || "icon"} overlaps ${
            controls[j].textContent.trim().slice(0, 20) || "icon"
          }`;
        }
      }
    }
    return null;
  });

  expect(overlap, `navbar controls overlap: ${overlap}`).toBeNull();

  // And nothing spills off the side.
  const spill = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(spill, "the page scrolls sideways on a phone").toBe(false);
});

/*
 * The authorisation boundary around packs.
 *
 * Every demo visitor is cloned into the shared template packs, so those prove
 * nothing about access control. A pack the first visitor creates fresh is
 * theirs alone — and a second, unrelated visitor must be refused it. The
 * refusal must be a 403, not an empty list, so a regression here fails loudly
 * rather than looking like a quiet feed.
 */
test("a pack feed is only readable and writable by its members", async ({
  page,
  browser,
}) => {
  await signIn(page);

  // A pack of one, made through the same endpoint the UI uses. The endpoint
  // requires a non-empty users array; the caller's own id satisfies it.
  const me = await page.request.get("/api/auth/me").then((r) => r.json());
  const created = await page.request.put("/api/createpack", {
    headers: await csrfHeaders(page),
    data: { pack_name: "Members Only", users: [me.user_id] },
  });
  expect(created.status(), "the member can create a pack").toBe(201);

  const packs = await page.request.get("/api/getpacks").then((r) => r.json());
  const packId = packs.find(
    (packRow) => packRow.name === "Members Only",
  )?.pack_id;
  expect(packId, "the new pack is in the creator's list").toBeTruthy();

  // The member reads and writes their own feed.
  const mine = await page.request.get(
    `/api/getAllPostsFromSpecificPack?packId=${packId}`,
  );
  expect(mine.status(), "a member can read the feed").toBe(200);

  // An unrelated visitor gets refused: reading, posting and joining.
  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await signIn(stranger);

  const read = await stranger.request.get(
    `/api/getAllPostsFromSpecificPack?packId=${packId}`,
  );
  expect(read.status(), "a non-member is refused the feed").toBe(403);

  const write = await stranger.request.post("/api/makePost", {
    headers: await csrfHeaders(stranger),
    data: { packet: { pack_id: packId, body: "should never land" } },
  });
  expect(write.status(), "a non-member cannot post").toBe(403);

  const join = await stranger.request.put("/api/addtopack", {
    headers: await csrfHeaders(stranger),
    data: { pack_id: packId },
  });
  expect(
    join.status(),
    "a stranger cannot join a pack no friend of theirs is in",
  ).toBe(403);

  await strangerContext.close();
});

test("there is no unauthenticated account endpoint", async ({ page }) => {
  // Load a page first so the CSRF cookie exists: the point here is that the
  // endpoint refuses an unauthenticated caller, not that CSRF got there first.
  await page.goto("/");
  const res = await page.request.put("/api/authuser", {
    headers: await csrfHeaders(page),
    data: { email: "nobody@example.com", name: "nobody" },
  });
  expect([401, 404]).toContain(res.status());
});

/*
 * The near-midnight window, pinned.
 *
 * The add form defaults to the next whole hour. From 23:00 the next whole
 * hour is 00:00 tomorrow — and when tomorrow falls outside the calendar's
 * current view (Saturday night, in a week view whose weeks start Sunday, it
 * always does), the playdate saved fine and appeared nowhere. The person who
 * just created it had no evidence it existed, which is exactly the class of
 * scheduling failure this app exists to not have. CI met the bug first: the
 * suite was green at 22:48 UTC and red from 23:18.
 */
test.describe("near midnight", () => {
  test.use({ timezoneId: "UTC" });

  test("a playdate added just before midnight is shown, not lost off-view", async ({
    page,
  }) => {
    // 2026-08-29 was a Saturday. 23:30 UTC in a UTC page: the default start
    // becomes 00:00 Sunday — next day, next week, next view.
    await page.clock.setFixedTime(new Date("2026-08-29T23:30:00Z"));

    await signIn(page);
    await page.locator('a[href="/calendar"]:visible').first().click();
    await expect(page.locator(".rbc-calendar")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /add playdate/i }).click();
    const modal = page.locator(".app-modal");
    await expect(modal).toBeVisible();

    await modal.locator("select").first().selectOption({ index: 1 });
    await modal.locator("textarea").fill("Playwright midnight walk");
    await modal.getByRole("button", { name: /add playdate/i }).click();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    // The calendar must follow the playdate to its date, or the creator is
    // staring at a view that does not contain what they just made.
    await expect(
      page.getByText("Playwright midnight walk").first(),
    ).toBeVisible({
      timeout: 20_000,
    });
  });
});
