/*
 * One place that talks to the API, typed by the contract.
 *
 * openapi-fetch reads src/api-types.d.ts (generated from server/openapi.json),
 * so a path, method, body or response that the server does not declare is a
 * compile error here rather than a 404 or an undefined in production. axios
 * used to do this untyped; six components once set their own base URL to a
 * developer's machine, which is why the base comes from Vite alone.
 *
 * BASE_URL is '/' normally and '/facewoof/' when the app is built to be served
 * under a path, which is exactly the prefix the API needs too.
 */
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./api-types";

// Absolute, on the page's own origin. A relative base would do in a browser,
// but openapi-fetch builds a Request before calling fetch, and Node's Request
// (which the component tests run against) refuses a relative URL. The origin
// is the one a relative URL would have resolved against anyway.
const base = new URL(
  import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  window.location.origin,
)
  .toString()
  .replace(/\/$/, "");

/* One cookie's value, decoded, or null. */
const readCookie = (name: string): string | null => {
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
};

/*
 * CSRF, double-submit style: the server sets a readable XSRF-TOKEN cookie and
 * refuses any request that is not a GET unless the same value comes back in
 * the x-xsrf-token header. axios did this by itself; now it is written down.
 */
const xsrf: Middleware = {
  onRequest({ request }) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      const token = readCookie("XSRF-TOKEN");
      if (token) request.headers.set("x-xsrf-token", token);
    }
  },
};

export const api = createClient<paths>({
  baseUrl: base,
  // Resolved per call rather than captured now: openapi-fetch would
  // otherwise hold on to whatever globalThis.fetch was when this module
  // loaded, which is before a test has installed its stand-in.
  fetch: (input) => globalThis.fetch(input),
  // The session lives in a signed, httpOnly cookie. Same-origin requests
  // send it anyway, but being explicit means a future split-origin
  // deployment does not silently stop authenticating.
  credentials: "same-origin",
});
api.use(xsrf);

/* A refused request, carrying the status the caller may branch on. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/*
 * The data of a response, or an ApiError. openapi-fetch never throws; it
 * hands back `{ data, error, response }`. Most call sites want the data or
 * an exception with the status on it, which is what this gives them.
 */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined || !result.response.ok) {
    const detail =
      result.error &&
      typeof result.error === "object" &&
      "error" in result.error
        ? String((result.error as { error: unknown }).error)
        : result.response.statusText;
    throw new ApiError(result.response.status, detail || "request failed");
  }
  return result.data as T;
}
