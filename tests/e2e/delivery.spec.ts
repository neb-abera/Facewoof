import { expect, type Page, type Response, test } from "@playwright/test";

/*
 * How the app reaches the browser.
 *
 * Every assertion here corresponds to something measured against production:
 * the bundle and stylesheet left the server uncompressed, every asset was
 * served with max-age=0 so a returning visitor re-validated all of it, the
 * hero photo was the 773 KB original from the repository, the landing page
 * paid for the calendar libraries it never renders, and the only way to reach
 * the sign-in page was to type /login into the address bar.
 */

/* Load the landing page and keep every response that arrived on the way. */
async function loadLanding(page: Page): Promise<Response[]> {
  const responses: Response[] = [];
  page.on("response", (res) => responses.push(res));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /try the demo/i }),
  ).toBeVisible();
  return responses;
}

const isAsset = (res: Response) =>
  new URL(res.url()).pathname.includes("/assets/");

test("the bundle and stylesheet are served compressed", async ({ page }) => {
  const responses = await loadLanding(page);

  const compressible = responses.filter(
    (res) => isAsset(res) && /\.(js|css)$/.test(new URL(res.url()).pathname),
  );
  expect(compressible.length).toBeGreaterThan(0);

  for (const res of compressible) {
    const encoding = (await res.headerValue("content-encoding")) || "identity";
    expect(encoding, `${res.url()} left the server uncompressed`).toMatch(
      /gzip|br|zstd/,
    );
  }
});

test("hashed assets are cacheable, the document is not", async ({ page }) => {
  const responses = await loadLanding(page);

  // Vite content-hashes everything under assets/, so a change produces a new
  // URL and the old one can be cached forever. max-age=0 made every return
  // visit re-validate each of them.
  for (const res of responses.filter(isAsset)) {
    const cache = (await res.headerValue("cache-control")) || "";
    expect(cache, `${res.url()} is not cacheable`).toContain("immutable");
  }

  // The document is the one URL that must stay fresh: it is where the hashed
  // names come from. `no-cache` still allows conditional revalidation.
  const doc = responses.find((res) => new URL(res.url()).pathname === "/");
  expect(doc, "the document itself was loaded").toBeTruthy();
  if (!doc) return;
  expect((await doc.headerValue("cache-control")) || "").toContain("no-cache");
});

test("the document and its assets set no cookies, so a CDN can cache them", async ({
  page,
}) => {
  const responses = await loadLanding(page);

  // Measured against production: every response carried XSRF-TOKEN and the
  // session cookie, hashed assets included, and Cloudflare will not store a
  // response that sets a cookie (cf-cache-status: BYPASS). Only /api may.
  const served = responses.filter(
    (res) => !new URL(res.url()).pathname.includes("/api/"),
  );
  expect(served.length).toBeGreaterThan(1);
  for (const res of served) {
    const cookies = (await res.headersArray()).filter(
      (h) => h.name.toLowerCase() === "set-cookie",
    );
    expect(cookies, `${res.url()} sets a cookie`).toEqual([]);
  }

  // The token still arrives before anyone can click: the app asks the API
  // who is signed in as it loads.
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === "XSRF-TOKEN"),
    )
    .toBe(true);
});

test("the demo starts even when the CSRF cookie is gone at click time", async ({
  page,
}) => {
  await loadLanding(page);
  // A cleared jar, or a click that beat /api/auth/me: the client fetches a
  // token before the write rather than sending it bare into a 403.
  await page.context().clearCookies();
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/discover", { timeout: 30_000 });
});

test("the hero photo is sized for the page, not the camera", async ({
  page,
}) => {
  const responses = await loadLanding(page);

  // The original was 2400×3595 and 773 KB, then a 212 KB JPEG at 1200×1797,
  // for a column 600 px wide - and it is the landing page's largest paint.
  // <picture> now offers AVIF and WebP at 600 and 1200 wide; a desktop
  // Chromium at 1x takes the 600 px AVIF, which is about 24 KB. The bound
  // leaves room to swap the photo without re-admitting an original.
  const heroes = responses.filter((res) =>
    /\.(jpe?g|webp|avif|png)$/.test(new URL(res.url()).pathname),
  );
  expect(heroes, "exactly one hero variant is downloaded").toHaveLength(1);
  const hero = heroes[0];
  if (!hero) return;
  expect(new URL(hero.url()).pathname).toMatch(/\.(avif|webp)$/);
  expect((await hero.body()).length).toBeLessThan(60_000);

  // Its box is reserved before it arrives, and it does not queue behind
  // the script.
  const img = page.getByAltText("A dog in a park");
  await expect(img).toHaveAttribute("width", "600");
  await expect(img).toHaveAttribute("height", "899");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  expect(
    await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0);
  // Still fills its column: <picture> must not have collapsed the layout.
  const box = await img.boundingBox();
  expect(box?.width).toBe(600);
  expect(box?.height).toBeGreaterThan(400);
});

test("the document opens connections to the photo hosts early", async ({
  page,
}) => {
  await page.goto("/");
  const hosts = await page
    .locator('link[rel="preconnect"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute("href")));
  expect(hosts).toEqual(["https://placedog.net", "https://res.cloudinary.com"]);

  // The same two hosts the CSP lets images come from; a third would be a
  // preconnect to somewhere no image can load from.
  const csp =
    (await page.request.get("/")).headers()["content-security-policy"] ?? "";
  const imgSrc = csp.split(";").find((d) => d.trim().startsWith("img-src"));
  for (const host of hosts) expect(imgSrc).toContain(host);
});

test("the landing page does not download the calendar", async ({ page }) => {
  const responses = await loadLanding(page);

  // date-fns and react-big-calendar are only rendered on /calendar, behind
  // sign-in. With the views code-split they live in the Calendar chunk, and a
  // visitor who bounces off the landing page never pays for them.
  const calendar = responses.filter((res) =>
    /calendar/i.test(new URL(res.url()).pathname),
  );
  expect(
    calendar,
    "the calendar chunk loaded on the landing page",
  ).toHaveLength(0);
});

test("the landing page offers a way to sign in", async ({ page }) => {
  await page.goto("/");

  // Regression: /login existed, with email and Google configured behind it,
  // but nothing on the landing page linked to it. The navbar hides itself for
  // signed-out visitors, so the page rendered exactly one path in: the demo.
  const signIn = page.getByRole("link", { name: /sign in/i });
  await expect(signIn).toBeVisible();

  await signIn.click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: /welcome to facewoof/i }),
  ).toBeVisible();
});
