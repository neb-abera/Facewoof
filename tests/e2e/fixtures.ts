import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  test as base,
  type Page,
  type Request,
  webkit,
} from "@playwright/test";

export { expect } from "@playwright/test";

/*
 * WebKit under Playwright 1.63 loses a navigation that cancels requests
 * still in flight. The WebKit build Playwright ships bundles libsoup 3.6.5,
 * which can finish a cancelled request twice. The second finish frees the
 * session's features, and WebKit's network process crashes or wedges. The
 * navigation then fails with "WebKit encountered an internal error" or never
 * commits, and page.goto waits out the test timeout. Upstream: libsoup
 * 794e089, released in 3.6.6, and microsoft/playwright#42803.
 *
 * Every WebKit failure in the smoke job on 2026-09-26 was a page.goto or
 * page.reload issued within 100 ms of a client-side route change, while the
 * route's chunks and API calls were loading. On GitHub's runner, 28 of 600
 * such navigations failed and the browser logged the libsoup assertion 162
 * times. With the page drained first, 0 of 600 failed and it logged none.
 *
 * So on WebKit, page.goto and page.reload wait until the page has no request
 * in flight. Chromium and Firefox navigate as they are. The app is not at
 * fault: Safari does not use libsoup.
 *
 * This module refuses to load once the bundled libsoup is 3.6.6 or newer,
 * so the Playwright bump that carries the fix is where it goes.
 */

/** The libsoup version inside Playwright's WebKit build, when it has one. */
export function bundledLibsoup(): number[] | undefined {
  let root: string;
  try {
    root = path.dirname(webkit.executablePath());
  } catch {
    return undefined;
  }
  for (const flavour of ["minibrowser-wpe", "minibrowser-gtk"]) {
    const lib = path.join(root, flavour, "sys", "lib");
    let names: string[];
    try {
      names = readdirSync(lib);
    } catch {
      continue;
    }
    const name = names.find((n) => n.startsWith("libsoup-3.0.so"));
    if (!name) continue;
    const found = /libsoup\/(\d+)\.(\d+)\.(\d+)/.exec(
      readFileSync(path.join(lib, name)).toString("latin1"),
    );
    if (found) return found.slice(1).map(Number);
  }
  return undefined;
}

/** Whether a libsoup version carries the fix, 3.6.6 or newer. */
export function isFixed([major = 0, minor = 0, patch = 0]: number[]): boolean {
  return major * 1_000_000 + minor * 1_000 + patch >= 3_006_006;
}

const libsoup = bundledLibsoup();
if (libsoup && isFixed(libsoup)) {
  throw new Error(
    `Playwright's WebKit now bundles libsoup ${libsoup.join(".")}, which carries the fix for ` +
      "microsoft/playwright#42803. Remove the WebKit wait in tests/e2e/fixtures.ts.",
  );
}

// Longest a page may keep a request open before the navigation goes ahead
// anyway. The suite's pages drain in well under a second.
const DRAIN_MS = 15_000;

/** On this page, page.goto and page.reload first wait for requests in flight. */
export function drainBeforeNavigating(page: Page): void {
  const inFlight = new Set<Request>();
  let drained: (() => void) | undefined;
  const done = (request: Request) => {
    inFlight.delete(request);
    if (inFlight.size === 0) drained?.();
  };
  page.on("request", (request) => inFlight.add(request));
  page.on("requestfinished", done);
  page.on("requestfailed", done);

  const drain = async () => {
    if (inFlight.size === 0) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, DRAIN_MS);
      drained = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    drained = undefined;
  };

  const goto = page.goto.bind(page);
  page.goto = async (...args: Parameters<Page["goto"]>) => {
    await drain();
    return goto(...args);
  };
  const reload = page.reload.bind(page);
  page.reload = async (...args: Parameters<Page["reload"]>) => {
    await drain();
    return reload(...args);
  };
}

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    if (browserName === "webkit") drainBeforeNavigating(page);
    await use(page);
  },
});
