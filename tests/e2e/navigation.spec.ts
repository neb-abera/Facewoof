import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "./fixtures.ts";

// Every WebKit hang in the smoke job had this shape: a page.goto issued the
// moment a client-side route change was seen, while that route's chunks and
// API calls were still loading. tests/e2e/fixtures.ts has the history.
test("navigating away while a route is still loading lands on the new page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/discover", { timeout: 30_000 });
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/profile$/);
});

/** The libsoup a running process has loaded, read from /proc/<pid>/maps. */
function loadedLibsoup(pid: string): number[] | undefined {
  let maps: string;
  try {
    maps = readFileSync(`/proc/${pid}/maps`, "utf8");
  } catch {
    return undefined;
  }
  const file = /\s(\/\S*libsoup-3\.0\.so\S*)$/m.exec(maps)?.[1];
  if (!file) return undefined;
  const version = /libsoup\/(\d+)\.(\d+)\.(\d+)/.exec(
    readFileSync(file).toString("latin1"),
  );
  return version?.slice(1).map(Number);
}

// libsoup 3.6.5 finishes a cancelled request twice and takes WebKit's
// network process down with it (libsoup 794e089, fixed in 3.6.6). Playwright
// bundles 3.6.5 with WebKit in its noble image. The resolute image loads the
// system's 3.6.6. This fails if the suite moves back to a 3.6.5 WebKit.
test("WebKit's network process loads libsoup 3.6.6 or newer", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "libsoup is WebKit's network library");
  test.skip(process.platform !== "linux", "libsoup is WebKit's Linux port");
  await page.goto("/");

  const versions = readdirSync("/proc")
    .filter((pid) => /^\d+$/.test(pid))
    .filter((pid) => {
      try {
        return readFileSync(`/proc/${pid}/cmdline`, "utf8").includes(
          "NetworkProcess",
        );
      } catch {
        return false;
      }
    })
    .map(loadedLibsoup)
    .filter((v): v is number[] => v !== undefined);

  expect(versions.length).toBeGreaterThan(0);
  for (const [major = 0, minor = 0, patch = 0] of versions) {
    expect(
      major * 1_000_000 + minor * 1_000 + patch,
      `libsoup ${major}.${minor}.${patch}`,
    ).toBeGreaterThanOrEqual(3_006_006);
  }
});
