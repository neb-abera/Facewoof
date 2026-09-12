/*
 * A fetch stand-in for component tests, routed by method and path.
 *
 * The client talks to the API through openapi-fetch, which calls the global
 * fetch, so stubbing fetch is the one seam that exercises everything above
 * it — the typed client, the CSRF middleware, the components — without a
 * server. Each handler answers one method+path; anything unhandled is a 404
 * and, because tests should not rely on accidental traffic, recorded so a
 * test can assert on it.
 */
import { vi } from "vitest";

export type Handler = (init: {
  url: URL;
  body: unknown;
  request: Request;
}) => Response | Promise<Response>;

export interface FakeApi {
  /* Every request made, oldest first. */
  calls: { method: string; path: string; body: unknown }[];
  on(method: string, path: string, handler: Handler): FakeApi;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const ok = (body: unknown) => json(body, 200);
export const created = (body: unknown) => json(body, 201);
export const noContent = () => new Response(null, { status: 204 });
export const refused = (status: number, error: string) =>
  json({ error }, status);

export function fakeApi(): FakeApi {
  const routes = new Map<string, Handler>();
  const api: FakeApi = {
    calls: [],
    on(method, path, handler) {
      routes.set(`${method.toUpperCase()} ${path}`, handler);
      return api;
    },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // The client sends relative URLs, which a browser resolves against
      // the page and Node's Request refuses; resolve them here.
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(raw, "http://localhost");
      // A Request passed as `init` is not a RequestInit dictionary: its
      // method and body would be dropped and every call would look like a
      // GET. Copy the parts that matter explicitly.
      const source = input instanceof Request ? input : new Request(url, init);
      const text = await source.clone().text();
      const request = new Request(url, {
        method: source.method,
        headers: source.headers,
        body: text || null,
      });
      const body = text ? JSON.parse(text) : undefined;
      api.calls.push({ method: request.method, path: url.pathname, body });
      const handler = routes.get(`${request.method} ${url.pathname}`);
      if (!handler)
        return refused(
          404,
          `no fake handler for ${request.method} ${url.pathname}`,
        );
      return handler({ url, body, request });
    }),
  );

  return api;
}
