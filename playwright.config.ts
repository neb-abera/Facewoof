import { readFileSync } from "node:fs";
import os from "node:os";
import { defineConfig, devices } from "@playwright/test";

/*
 * Firefox under Playwright 1.63 loses the commit of a navigation that
 * crosses a Cross-Origin-Opener-Policy boundary when the new page then calls
 * history.replaceState, which React Router does on start-up. The page loads
 * and fires load, but page.goto waits for a commit event the browser's
 * Playwright agent never sends, until the test times out. Upstream bug
 * microsoft/playwright#42731, fixed after 1.63.0.
 *
 * Measured on GitHub's runner on 2026-09-26: 59 of 1,200 Firefox runs of
 * delivery.spec.ts hung in page.goto("/") with the header enforced. The
 * server sends COOP same-origin (helmet's default), so every test's first
 * navigation crosses that boundary.
 *
 * The pref stops Firefox acting on the header. The server still sends it,
 * and Chromium and WebKit still enforce it. No spec depends on the opener
 * isolation it provides.
 *
 * The fix is on Playwright's main branch after 1.63.0, so 1.64 is the first
 * release that can carry it. When package.json reaches 1.64, this
 * refuses to load, so the Dependabot pull request that takes 1.64 is where
 * the workaround goes.
 */
const playwrightVersion: string = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).devDependencies["@playwright/test"];
const [pwMajor = 0, pwMinor = 0] = playwrightVersion.split(".").map(Number);
if (pwMajor > 1 || (pwMajor === 1 && pwMinor >= 64)) {
  throw new Error(
    `@playwright/test ${playwrightVersion} carries the fix for microsoft/playwright#42731. ` +
      "Remove browser.tabs.remote.useCrossOriginOpenerPolicy from the Firefox project in playwright.config.ts.",
  );
}

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
            // microsoft/playwright#42731, see the top of this file.
            "browser.tabs.remote.useCrossOriginOpenerPolicy": false,
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
