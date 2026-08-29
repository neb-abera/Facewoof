const { test, expect } = require('@playwright/test');

/*
 * The profile page, as its owner sees it.
 *
 * Every assertion corresponds to something that shipped broken. The page read
 * `data[0]` out of an object, so every field rendered blank; the avatar
 * defaulted to a hotlinked reddit image the CSP blocks, so the page opened on
 * a broken picture; the edit form opened empty instead of prefilled; and the
 * likes fields posted names the server never read, so nothing typed in them
 * was ever stored.
 */

async function startDemo(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /try the demo/i }).click();
  await page.waitForURL('**/discover', { timeout: 30_000 });
}

test('the profile page shows the dog, not a blank card', async ({ page }) => {
  await startDemo(page);

  const me = await (await page.request.get('/api/auth/me')).json();
  await page
    .getByRole('link', { name: /profile/i })
    .first()
    .click();

  // The dog's name, from the account itself — not a hardcoded fixture.
  await expect(page.getByRole('heading', { name: me.dog_name })).toBeVisible();

  // Every image actually renders. naturalWidth is what distinguishes a
  // rendered photo from a blocked or broken one; the old default avatar
  // failed exactly this.
  await page.waitForFunction(
    () => {
      const imgs = [...document.querySelectorAll('.profile img')];
      return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: 15_000 }
  );
});

test('the edit form opens with the current profile in it', async ({ page }) => {
  await startDemo(page);

  const me = await (await page.request.get('/api/auth/me')).json();
  await page
    .getByRole('link', { name: /profile/i })
    .first()
    .click();
  await page.getByRole('button', { name: /edit profile/i }).click();

  // Prefilled, not blank: saving an untouched form must not erase the dog.
  await expect(page.getByLabel(/dog's name/i)).toHaveValue(me.dog_name);
});

test('playdate details survive the round trip to the server', async ({ page }) => {
  await startDemo(page);

  await page
    .getByRole('link', { name: /profile/i })
    .first()
    .click();
  await page.getByRole('button', { name: /edit profile/i }).click();

  await page.getByLabel(/^size$/i).selectOption('medium');
  await page.getByLabel(/^energy$/i).selectOption('high');
  await page.getByLabel(/best time to play/i).selectOption('weekends');
  await page.getByLabel(/loves 1/i).fill('Playing fetch');
  await page
    .getByLabel(/anything a playdate should know/i)
    .fill('Great with small dogs, brings her own ball.');
  await page.getByRole('button', { name: /save profile/i }).click();

  // Back on the display, reading what the server stored — not local state.
  const facts = page.locator('.profile__facts');
  await expect(facts).toContainText('Medium');
  await expect(facts).toContainText('High energy');
  await expect(facts).toContainText('Weekends');
  await expect(page.getByText('Playing fetch')).toBeVisible();
  await expect(page.getByText('Great with small dogs, brings her own ball.')).toBeVisible();
});
