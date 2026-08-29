const { test, expect } = require('@playwright/test');

/*
 * The demo, as a visitor experiences it.
 *
 * Every assertion here corresponds to something that actually shipped broken.
 * They are written against what the visitor sees rather than against
 * implementation details, so they keep their value as the code moves.
 */

/* Collect anything the browser refused to load or complained about. */
function watchForFailures(page) {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    problems.push(`request failed: ${req.url()} (${req.failure()?.errorText})`);
  });
  page.on('response', (res) => {
    if (res.status() >= 500) problems.push(`${res.status()} from ${res.url()}`);
  });
  return problems;
}

/* Start the demo from the landing page and land on the discover feed. */
async function startDemo(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /try the demo/i }).click();
  await page.waitForURL('**/discover', { timeout: 30_000 });
}

test('the landing page starts the demo in one click', async ({ page }) => {
  await page.goto('/');

  // Regression: the call to action used to be a link to /login, where the only
  // thing on offer was the same button again.
  const cta = page.getByRole('button', { name: /try the demo/i });
  await expect(cta).toBeVisible();

  await cta.click();
  await expect(page).toHaveURL(/\/discover/, { timeout: 30_000 });
});

test('the discover feed shows dogs, and their photos actually load', async ({ page }) => {
  const problems = watchForFailures(page);
  await startDemo(page);

  await expect(page.locator('.profile-card').first()).toBeVisible();

  // Regression: helmet's default CSP was img-src 'self', which blocked every
  // photo. The markup was correct and the page was full of broken images, so
  // an assertion on the <img> tags alone would have passed. naturalWidth is
  // what distinguishes "rendered" from "refused".
  await page.waitForFunction(
    () => {
      const imgs = [...document.querySelectorAll('.card-stack img')];
      return imgs.length > 0 && imgs.every((i) => i.complete);
    },
    null,
    { timeout: 30_000 }
  );

  const images = await page.evaluate(() =>
    [...document.querySelectorAll('.card-stack img')].map((i) => ({
      src: i.src,
      loaded: i.naturalWidth > 0
    }))
  );

  expect(images.length).toBeGreaterThan(0);
  const broken = images.filter((i) => !i.loaded);
  expect(broken, `broken images: ${JSON.stringify(broken, null, 2)}`).toHaveLength(0);

  const csp = problems.filter((p) => /content security policy|refused to load/i.test(p));
  expect(csp, `CSP violations: ${csp.join('\n')}`).toHaveLength(0);
});

test('a match shows both photos, not a name where a photo should be', async ({ page }) => {
  await startDemo(page);
  await expect(page.locator('.profile-card').first()).toBeVisible();

  // The first few profiles have already swiped yes, so one Woof matches.
  await page.getByRole('button', { name: /^woof$/i }).click();

  const overlay = page.locator('.match-parent');
  await expect(overlay).toBeVisible({ timeout: 15_000 });

  // Regression: the heading was hidden behind the navbar and search bar,
  // because the overlay was absolute at z-index 5 inside the discover view.
  await expect(overlay.getByText(/it's a match/i)).toBeInViewport();

  // Regression: nothing loaded the signed-in user's own photos, so the browser
  // rendered the alt text in a 25vh circle — a dog's name floating where its
  // picture should be.
  //
  // Waited for rather than sampled: the overlay animates in before its images
  // have finished decoding, so reading naturalWidth straight away reports
  // every one of them as broken.
  await page.waitForFunction(
    () => {
      const imgs = [...document.querySelectorAll('.match-parent img')];
      return imgs.length > 0 && imgs.every((i) => i.complete);
    },
    null,
    { timeout: 20_000 }
  );

  const matchImages = await overlay.evaluate((el) =>
    [...el.querySelectorAll('img')].map((i) => ({ src: i.src, loaded: i.naturalWidth > 0 }))
  );
  expect(matchImages.length).toBeGreaterThan(0);
  expect(matchImages.filter((i) => !i.loaded)).toHaveLength(0);
});

test('no developer instructions are shown to visitors', async ({ page }) => {
  await startDemo(page);
  await page.goto('/profile');

  // Regression: an unconfigured Cloudinary told the visitor to "set
  // VITE_CLOUD_NAME and VITE_UPLOAD_PRESET", which is an instruction to
  // whoever deploys the app, shown to whoever is using it.
  await expect(page.locator('body')).not.toContainText(/VITE_[A-Z_]+/);
  await expect(page.locator('body')).not.toContainText(/undefined|NaN|\[object Object\]/);
});

test('a card can be dragged away to choose', async ({ page }) => {
  await startDemo(page);
  const card = page.locator('.card-stack .profile-card').last();
  await expect(card).toBeVisible();

  // Regression: under React 19 react-draggable's findDOMNode fallback threw
  // "<DraggableCore> not mounted on DragStart!" on every mousedown, and
  // dragging — the way the feed is meant to be used — silently did nothing.
  // The swipe request is the proof the drag registered as a choice.
  const responded = page.waitForRequest(
    (req) => req.url().includes('/api/response') && req.method() === 'POST',
    { timeout: 10_000 }
  );

  // Grip the middle of the card: its bounding box starts under the search
  // bar, which sits above it in z-order, so a grab near the top lands on the
  // bar instead and nothing moves.
  const box = await card.boundingBox();
  const gripX = box.x + box.width / 2;
  const gripY = box.y + box.height / 2;
  await page.mouse.move(gripX, gripY);
  await page.mouse.down();
  // In steps, so the handler sees a drag rather than a teleport.
  await page.mouse.move(gripX + 250, gripY, { steps: 12 });
  await page.mouse.up();

  await responded;
});

test('a signed-in visitor returning to the landing page lands on their feed', async ({ page }) => {
  await startDemo(page);

  // Regression: coming back to the site signed in showed the pitch and the
  // demo button again, and Discover had to be found by hand in the navbar.
  await page.goto('/');
  await expect(page).toHaveURL(/\/discover/, { timeout: 15_000 });
});

test('the signed-out visitor cannot reach the app', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/discover');

  // The route guard sends them to the landing page or sign-in rather than
  // rendering an empty feed.
  await expect(page).toHaveURL(/\/(login)?$/, { timeout: 15_000 });
});
