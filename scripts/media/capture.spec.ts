/*
 * Capture the README's screenshots and demo recording from the running app.
 *
 * One walk through the demo as a visitor sees it: the landing page, starting
 * the demo, a match, the profile, the calendar and the pack feed, with a
 * phone-sized view of the feed at the end. The context is recorded the whole
 * way; capture.sh trims and converts the recording afterwards.
 *
 * Written as a Playwright test so the browser image transpiles and runs it;
 * there is nothing to assert beyond "the page rendered", and those checks are
 * here only so a capture of a broken page fails instead of shipping.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const OUT = path.resolve(import.meta.dirname, "out");

const shot = (page: Page, name: string) =>
  page.screenshot({
    path: path.join(OUT, `${name}.png`),
    animations: "disabled",
  });

/* Wait until every image in `selector` has actually decoded. */
const imagesLoaded = (page: Page, selector: string) =>
  page.waitForFunction(
    (sel) => {
      const imgs = [...document.querySelectorAll<HTMLImageElement>(sel)];
      return (
        imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0)
      );
    },
    selector,
    { timeout: 30_000 },
  );

// A moment for the eye, in the recording. Screenshots never need it.
const beat = (page: Page, ms = 900) => page.waitForTimeout(ms);

test("walk the demo and capture it", async ({ page, context, browser }) => {
  fs.mkdirSync(OUT, { recursive: true });

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /try the demo/i }),
  ).toBeVisible();
  await imagesLoaded(page, "img");
  await shot(page, "landing");
  await beat(page, 1500);

  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/discover", { timeout: 30_000 });
  await expect(page.locator(".card-stack .profile-card").first()).toBeVisible();
  await imagesLoaded(page, ".card-stack img");
  await beat(page, 1200);
  await shot(page, "discover");

  // Drag the top card aside, the way the feed is meant to be used.
  const card = page.locator(".card-stack .profile-card").last();
  const box = await card.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 260, y + 20, { steps: 25 });
    await page.mouse.up();
    await beat(page, 1200);
  }

  // The first few roster dogs already like the visitor, so a Woof matches.
  await page.getByRole("button", { name: /^woof$/i }).click();
  const overlay = page.locator(".match-parent");
  await expect(overlay).toBeVisible({ timeout: 15_000 });
  await imagesLoaded(page, ".match-parent img");
  await beat(page, 800);
  await shot(page, "match");
  await beat(page, 1500);
  await page.getByRole("button", { name: /keep searching/i }).click();
  await beat(page, 800);

  await page.locator('a[href="/profile"]:visible').first().click();
  await expect(page.getByText(/friends list/i)).toBeVisible({
    timeout: 20_000,
  });
  await imagesLoaded(page, ".profile img");
  await beat(page, 1000);
  await shot(page, "profile");
  await beat(page, 1200);

  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 20_000 });
  await beat(page, 1000);

  // Put a playdate on the calendar, so the calendar and the pack feed's
  // "coming up" show what the app is for rather than an empty week.
  await page.getByRole("button", { name: /add playdate/i }).click();
  const modal = page.locator(".app-modal");
  await expect(modal).toBeVisible();
  await beat(page, 800);
  await modal.locator("select").first().selectOption({ index: 1 });
  await modal
    .locator("textarea")
    .pressSequentially("Puddle patrol at the dog run — bring towels", {
      delay: 25,
    });
  await beat(page, 600);
  await modal.getByRole("button", { name: /add playdate/i }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText(/puddle patrol/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await beat(page, 1200);
  await shot(page, "calendar");
  await beat(page, 1200);

  await page.locator('a[href="/packFeed"]:visible').first().click();
  await expect(page.getByText(/your packs/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await beat(page, 1000);
  await shot(page, "packfeed");
  await beat(page, 1500);

  // A phone-sized look at the feed, in the same signed-in session. Its own
  // context, without a recording: every page in the recorded context gets a
  // video of its own, and this one is a still.
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await phoneContext.addCookies(await context.cookies());
  const phone = await phoneContext.newPage();
  await phone.goto("/discover");
  await expect(phone.locator(".card-stack .profile-card").first()).toBeVisible({
    timeout: 20_000,
  });
  await imagesLoaded(phone, ".card-stack img");
  await shot(phone, "discover-phone");
  await phoneContext.close();
});

// The recording is only written when the context closes, so it is collected
// here rather than in the test.
test.afterAll(async () => {
  // Playwright names the file after the test; find it and give it a stable
  // name for capture.sh. The largest file is the walk-through: any other
  // page opened in the recorded context leaves a short clip of its own.
  const raw = path.join(OUT, "raw");
  const videos: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".webm")) videos.push(full);
    }
  };
  walk(raw);
  const [video] = videos.sort(
    (a, b) => fs.statSync(b).size - fs.statSync(a).size,
  );
  if (video) fs.copyFileSync(video, path.join(OUT, "demo.webm"));
});
