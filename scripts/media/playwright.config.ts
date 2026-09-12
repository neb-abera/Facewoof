import { defineConfig, devices } from "@playwright/test";

/*
 * Not a test run: a capture session. `make media` points this at the
 * production image and capture.spec.ts walks the demo the way a visitor
 * would, saving the screenshots and the screen recording the README shows.
 * Same browser image as the e2e suite, so what is captured is what the suite
 * tests.
 */
export default defineConfig({
  testDir: ".",
  outputDir: "./out/raw",
  timeout: 180_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    // The recording is the README's demo clip; sized to the viewport so
    // nothing is letterboxed.
    video: { mode: "on", size: { width: 1280, height: 800 } },
    // Denied, as in the suite: the demo must work without a location, and a
    // permission prompt would sit in the recording.
    permissions: [],
  },
});
