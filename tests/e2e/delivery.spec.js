const { test, expect } = require('@playwright/test');

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
async function loadLanding(page) {
  const responses = [];
  page.on('response', (res) => responses.push(res));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /try the demo/i })).toBeVisible();
  return responses;
}

const isAsset = (res) => new URL(res.url()).pathname.includes('/assets/');

test('the bundle and stylesheet are served compressed', async ({ page }) => {
  const responses = await loadLanding(page);

  const compressible = responses.filter(
    (res) => isAsset(res) && /\.(js|css)$/.test(new URL(res.url()).pathname)
  );
  expect(compressible.length).toBeGreaterThan(0);

  for (const res of compressible) {
    const encoding = (await res.headerValue('content-encoding')) || 'identity';
    expect(encoding, `${res.url()} left the server uncompressed`).toMatch(/gzip|br|zstd/);
  }
});

test('hashed assets are cacheable, the document is not', async ({ page }) => {
  const responses = await loadLanding(page);

  // Vite content-hashes everything under assets/, so a change produces a new
  // URL and the old one can be cached forever. max-age=0 made every return
  // visit re-validate each of them.
  for (const res of responses.filter(isAsset)) {
    const cache = (await res.headerValue('cache-control')) || '';
    expect(cache, `${res.url()} is not cacheable`).toContain('immutable');
  }

  // The document is the one URL that must stay fresh: it is where the hashed
  // names come from. `no-cache` still allows conditional revalidation.
  const doc = responses.find((res) => new URL(res.url()).pathname === '/');
  expect((await doc.headerValue('cache-control')) || '').toContain('no-cache');
});

test('the hero photo is sized for the page, not the camera', async ({ page }) => {
  const responses = await loadLanding(page);

  // The original was 2400×3595 and 773 KB, displayed 600 px wide. The
  // committed asset is a fraction of that; the bound leaves room to swap the
  // photo without re-admitting the original.
  const hero = responses.find((res) =>
    /\.(jpe?g|webp|avif|png)$/.test(new URL(res.url()).pathname)
  );
  expect(hero, 'the landing page shows a hero photo').toBeTruthy();
  expect((await hero.body()).length).toBeLessThan(250_000);
});

test('the landing page does not download the calendar', async ({ page }) => {
  const responses = await loadLanding(page);

  // moment and react-big-calendar are only rendered on /calendar, behind
  // sign-in. With the views code-split they live in the Calendar chunk, and a
  // visitor who bounces off the landing page never pays for them.
  const calendar = responses.filter((res) => /calendar/i.test(new URL(res.url()).pathname));
  expect(calendar, 'the calendar chunk loaded on the landing page').toHaveLength(0);
});

test('the landing page offers a way to sign in', async ({ page }) => {
  await page.goto('/');

  // Regression: /login existed, with email and Google configured behind it,
  // but nothing on the landing page linked to it. The navbar hides itself for
  // signed-out visitors, so the page rendered exactly one path in: the demo.
  const signIn = page.getByRole('link', { name: /sign in/i });
  await expect(signIn).toBeVisible();

  await signIn.click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /welcome to facewoof/i })).toBeVisible();
});
