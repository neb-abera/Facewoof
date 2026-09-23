import os from "node:os";
import { defineConfig, devices } from "@playwright/test";

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
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // A failure that only appears on a retry is a flake worth seeing, so retries
  // are for CI only.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Denied on purpose: the demo must work for someone who refuses to share
    // their location, which is the path that reaches the fallback city.
    permissions: [],
  },
  // Half the cores, at most eight: three engines at 24 workers put Firefox
  // at 15 s a test on a 48-core box.
  workers: Math.min(8, Math.max(1, Math.floor(os.cpus().length / 2))),
  // Every browser engine, every run. A fix verified in Chromium alone
  // (aberaTech #191, 2026-09-22) was no fix in Firefox. The Playwright image
  // scripts/e2e.sh runs in ships all three.
  //
  // One engine after another. Every limit in server/limits.ts is per
  // address and per minute, sized for one browser, and the suite proves
  // some of them by hitting them; three engines at once tripled the rate
  // and the second engine saw 429 where it expected 201.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Headless Firefox leaves a permission prompt unanswered; Chromium
        // and WebKit deny it. Deny it here too, the same path as the
        // `permissions: []` above.
        launchOptions: {
          firefoxUserPrefs: {
            "geo.prompt.testing": true,
            "geo.prompt.testing.allow": false,
          },
        },
      },
      dependencies: ["chromium"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["firefox"],
    },
  ],
});
