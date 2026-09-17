/*
 * The CSRF half of src/api.ts.
 *
 * The document and the bundle are served without cookies so a CDN can cache
 * them; only /api responses carry XSRF-TOKEN. A write that finds no token -
 * a click that beat /api/auth/me, a cleared jar - must fetch one before it
 * goes out, or "Try the demo" is a 403 and a dead button.
 */
import { expect, test } from "vitest";
import { api } from "../../src/api";
import { fakeApi, noContent, ok } from "./fakeApi";

const clearToken = () => {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API
  document.cookie =
    "XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};

test("a write echoes the token the jar already holds, with no extra request", async () => {
  let sent: string | null = null;
  const fake = fakeApi().on("POST", "/api/auth/logout", ({ request }) => {
    sent = request.headers.get("x-xsrf-token");
    return noContent();
  });

  await api.POST("/api/auth/logout");

  expect(sent).toBe("test-token");
  expect(fake.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    "POST /api/auth/logout",
  ]);
});

test("a write with an empty jar fetches a token first, then echoes it", async () => {
  clearToken();
  let sent: string | null = null;
  const fake = fakeApi()
    .on("GET", "/api/auth/providers", () => {
      // What the server's Set-Cookie does in a browser.
      // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API
      document.cookie = "XSRF-TOKEN=fresh%2Ftoken; path=/";
      return ok({ providers: [] });
    })
    .on("POST", "/api/auth/logout", ({ request }) => {
      sent = request.headers.get("x-xsrf-token");
      return noContent();
    });

  await api.POST("/api/auth/logout");

  expect(fake.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    "GET /api/auth/providers",
    "POST /api/auth/logout",
  ]);
  // Decoded on the way out of the jar: the header carries the raw token.
  expect(sent).toBe("fresh/token");
});

test("a read never waits for a token", async () => {
  clearToken();
  const fake = fakeApi().on("GET", "/api/auth/providers", () =>
    ok({ providers: [] }),
  );

  await api.GET("/api/auth/providers");

  expect(fake.calls).toHaveLength(1);
});

test("a failed token fetch still lets the write go out, to be refused by the server", async () => {
  clearToken();
  let sent: string | null = "unset";
  fakeApi()
    .on("GET", "/api/auth/providers", () => {
      throw new TypeError("network down");
    })
    .on("POST", "/api/auth/logout", ({ request }) => {
      sent = request.headers.get("x-xsrf-token");
      return new Response(null, { status: 403 });
    });

  const { response } = await api.POST("/api/auth/logout");

  expect(sent).toBeNull();
  expect(response.status).toBe(403);
});
