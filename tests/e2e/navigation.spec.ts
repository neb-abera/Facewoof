import { bundledLibsoup, expect, isFixed, test } from "./fixtures.ts";

// Every WebKit hang in the smoke job had this shape: a page.goto issued the
// moment a client-side route change was seen, while that route's chunks and
// API calls were still loading. tests/e2e/fixtures.ts has the cause.
test("navigating away while a route is still loading lands on the new page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/discover", { timeout: 30_000 });
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/profile$/);
});

test("the WebKit wait retires itself at the libsoup release that fixes it", async ({
  browserName,
}) => {
  expect(isFixed([3, 6, 5])).toBe(false);
  expect(isFixed([3, 5, 9])).toBe(false);
  expect(isFixed([3, 6, 6])).toBe(true);
  expect(isFixed([3, 7, 0])).toBe(true);
  expect(isFixed([4, 0, 0])).toBe(true);
  // The guard reads a real version from the browser build this suite runs,
  // so it cannot pass by finding nothing.
  if (browserName === "webkit") expect(bundledLibsoup()).toBeDefined();
});
