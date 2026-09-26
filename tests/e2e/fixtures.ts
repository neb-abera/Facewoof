import { test as base, type Page, type Request } from "@playwright/test";

export { expect } from "@playwright/test";

/*
 * On WebKit, page.goto and page.reload wait until the page's network has been
 * quiet for 500 ms, and so does the end of each test before its context
 * closes. Chromium and Firefox run as they are.
 *
 * WebKit lost navigations that cancelled requests still in flight. Every
 * WebKit failure in the smoke job up to 2026-09-26 was a page.goto or
 * page.reload issued within 100 ms of a client-side route change, while the
 * route's chunks and API calls were loading. It failed with "WebKit
 * encountered an internal error" or never committed.
 *
 * Most of it was libsoup 3.6.5, bundled with WebKit in Playwright's noble
 * image, which can finish a cancelled request twice (libsoup 794e089,
 * microsoft/playwright#42803). The resolute image loads the system libsoup
 * 3.6.6, and navigation.spec.ts holds WebKit to 3.6.6 or newer. On GitHub's
 * runner, navigating the moment /discover appears:
 *
 *   noble, no wait          39 of 600 failed
 *   resolute, no wait        5 of 1,400 failed
 *   resolute, this wait      0 of 800
 *
 * The resolute failures were a fresh page whose first page.goto was never
 * answered, after the previous test closed its context mid-load, and a
 * page.goto that ended back on /discover. Both went away with the wait.
 */

// The quiet that Playwright's own "networkidle" uses. Waiting only for the
// requests in flight at the moment of page.goto was not enough: a route's
// chunks and API calls start up to 90 ms later.
const QUIET_MS = 500;
// Longest a page may keep the network busy before the navigation goes ahead
// anyway. The suite's pages settle in well under a second.
const SETTLE_MS = 15_000;

/**
 * On this page, page.goto and page.reload first wait for the network to go
 * quiet. Returns the wait, for the end of the test.
 */
export function settleBeforeNavigating(page: Page): () => Promise<void> {
  const inFlight = new Set<Request>();
  let lastActivity = 0;
  page.on("request", (request) => {
    inFlight.add(request);
    lastActivity = Date.now();
  });
  const done = (request: Request) => {
    inFlight.delete(request);
    lastActivity = Date.now();
  };
  page.on("requestfinished", done);
  page.on("requestfailed", done);

  const settle = async () => {
    const deadline = Date.now() + SETTLE_MS;
    while (
      Date.now() < deadline &&
      (inFlight.size > 0 || Date.now() - lastActivity < QUIET_MS)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  const goto = page.goto.bind(page);
  page.goto = async (...args: Parameters<Page["goto"]>) => {
    await settle();
    return goto(...args);
  };
  const reload = page.reload.bind(page);
  page.reload = async (...args: Parameters<Page["reload"]>) => {
    await settle();
    return reload(...args);
  };
  return settle;
}

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    if (browserName !== "webkit") {
      await use(page);
      return;
    }
    const settle = settleBeforeNavigating(page);
    await use(page);
    // Closing the context cancels whatever is still loading too, and the
    // network process is shared by every context the browser opens.
    await settle();
  },
});
