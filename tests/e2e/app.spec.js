const { test, expect } = require('@playwright/test');

/*
 * The app beyond the demo's happy path.
 *
 * The first suite covered signing in and swiping. Everything here is something
 * that was reported broken by someone actually using the app, which is the
 * gap that suite left.
 */

async function signIn(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /try the demo/i }).click();
  await page.waitForURL('**/discover', { timeout: 30_000 });
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
      const m = str.match(/-?[\d.]+/g);
      if (!m) return null;
      if (str.startsWith('oklch') || str.startsWith('lab') || str.startsWith('color(')) return null;
      if (m.length >= 4 && Number(m[3]) === 0) return null;
      return [Number(m[0]), Number(m[1]), Number(m[2])];
    };
    const probe = document.createElement('span');
    probe.textContent = 'x';
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

test('every page is reachable from every other page', async ({ page }) => {
  await signIn(page);

  // Regression: the navbar was position:static with no stacking context, so
  // its collapsed menu painted underneath the profile card and the links were
  // simply not clickable. The links existed; clicking them did nothing.
  const pages = ['/profile', '/calendar', '/packFeed', '/discover'];

  for (const target of pages) {
    const link = page.locator(`a[href="${target}"]:visible`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(target.replace('/', '\\/')), { timeout: 15_000 });
  }
});

test('nothing covers the navigation links', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/profile"]:visible').first().click();
  await expect(page).toHaveURL(/\/profile/);

  // Whatever sits at the centre of the Discover link must be the link itself.
  // toBeVisible() passes for an element buried under another one.
  const covered = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find(
      (a) => a.getAttribute('href') === '/discover' && a.offsetParent !== null
    );
    if (!link) return 'no visible Discover link';
    const r = link.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return top && (top === link || link.contains(top) || top.contains(link))
      ? null
      : `covered by ${top ? top.tagName + '.' + top.className : 'nothing'}`;
  });
  expect(covered, `the Discover link is not clickable: ${covered}`).toBeNull();
});

test('the calendar is legible', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });

  // Regression: react-big-calendar ships a light stylesheet, so on the dark
  // theme the day headers were light grey on near-white and the toolbar
  // buttons were dark grey on near-black.
  for (const selector of ['.rbc-header', '.rbc-toolbar button', '.rbc-label']) {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) continue;
    const ratio = await contrastRatio(el);
    if (ratio === null) continue;
    expect(ratio, `${selector} contrast is ${ratio?.toFixed(2)}:1`).toBeGreaterThan(3);
  }
});

test('a playdate appears on the calendar after it is added', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /add playdate/i }).click();
  const modal = page.locator('.app-modal');
  await expect(modal).toBeVisible();

  // Pick the first real pack and submit. The form opens with the next whole
  // hour already filled in, so a playdate takes one choice rather than typing
  // two full dates.
  await modal.locator('select').first().selectOption({ index: 1 });
  await modal.locator('textarea').fill('Playwright walk');
  await modal.getByRole('button', { name: /add playdate/i }).click();

  // Regression: the calendar only fetched on mount, so a playdate saved but
  // never appeared and the feature looked broken.
  await expect(modal).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText('Playwright walk').first()).toBeVisible({ timeout: 20_000 });
});

test('a transient API error does not sign the visitor out', async ({ page }) => {
  await signIn(page);

  // Regression: the client cleared the session on any rejected request, so one
  // 429 or 500 logged the visitor out permanently. Only a 401 means the
  // account is actually gone.
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 500, body: 'boom' }));
  await page.reload();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
});

test('a demo visitor lands on their profile, not an edit form', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/profile"]:visible').first().click();

  // Regression: signing in set firstLogin, which renders the edit form, so
  // every demo visitor met a form instead of the profile they came to see.
  await expect(page.getByText(/friends list/i)).toBeVisible({ timeout: 20_000 });
});

/*
 * Modals.
 *
 * react-modal replaces its default content class when you pass className, so
 * the add-playdate form lost all positioning and opened against the top-left
 * corner. Its default overlay is also rgba(255,255,255,0.75) — a white wash
 * over a dark app.
 */
test('the add-playdate form opens centred, over a dark scrim', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/calendar"]:visible').first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /add playdate/i }).click();

  const box = page.locator('.app-modal');
  await expect(box).toBeVisible();

  const geometry = await box.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const overlay = el.closest('.app-modal__overlay');
    return {
      centreX: r.left + r.width / 2,
      centreY: r.top + r.height / 2,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      withinViewport: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight + 1,
      overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null
    };
  });

  // Centred to within a tenth of the viewport on each axis.
  expect(Math.abs(geometry.centreX - geometry.viewportW / 2)).toBeLessThan(
    geometry.viewportW * 0.1
  );
  expect(Math.abs(geometry.centreY - geometry.viewportH / 2)).toBeLessThan(
    geometry.viewportH * 0.1
  );
  // Entirely on screen, rather than running off the bottom.
  expect(geometry.withinViewport, 'the form is not fully on screen').toBe(true);

  // A dark scrim, not the library's white default.
  const scrim = geometry.overlayBg.match(/[\d.]+/g).map(Number);
  expect(scrim.slice(0, 3).reduce((a, b) => a + b) / 3, 'the scrim is light').toBeLessThan(90);
});

test('the pack feed sidebar is legible', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/packFeed"]:visible').first().click();

  // "Your Packs" was a bare div with no heading, padding or weight.
  const heading = page.getByText(/your packs/i).first();
  await expect(heading).toBeVisible({ timeout: 20_000 });

  const ratio = await contrastRatio(heading);
  if (ratio !== null)
    expect(ratio, `heading contrast is ${ratio?.toFixed(2)}:1`).toBeGreaterThan(4);

  // The sidebar's actions have to be reachable, not clipped by a fixed height.
  const createPack = page.getByText(/create pack/i).first();
  await expect(createPack).toBeVisible();
  const clipped = await createPack.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > window.innerHeight || r.right > window.innerWidth || r.width === 0;
  });
  expect(clipped, 'the Create Pack control is clipped out of view').toBe(false);
});

test('a pack can be created from the pack feed', async ({ page }) => {
  await signIn(page);
  await page.locator('a[href="/packFeed"]:visible').first().click();

  await page.getByRole('button', { name: /create pack/i }).click();

  // One dialog, not the three overlapping ones the checkbox-hack produced.
  const dialog = page.locator('.app-modal');
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.app-modal')).toHaveCount(1);

  await dialog.locator('.create-pack__friend').first().click();
  await dialog.locator('input').fill('Playwright Pack');
  await dialog.getByRole('button', { name: /^create pack$/i }).click();

  await expect(dialog.getByText(/is ready/i)).toBeVisible({ timeout: 20_000 });
});
