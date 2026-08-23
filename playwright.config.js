const { defineConfig, devices } = require('@playwright/test');

/*
 * Browser tests against a running instance.
 *
 * BASE_URL points at whatever is being tested: the production image on
 * localhost in CI, the dev server locally, or the deployed site.
 *
 * These exist because the API smoke test could not have caught any of the
 * bugs that reached production — blocked images, alt text rendered in place of
 * a photo, an overlay hidden behind the search bar, a call to action that
 * needed two clicks. None of those are visible to curl.
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // A failure that only appears on a retry is a flake worth seeing, so retries
  // are for CI only.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Denied on purpose: the demo must work for someone who refuses to share
    // their location, which is the path that reaches the fallback city.
    permissions: [],
    geolocation: undefined
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
