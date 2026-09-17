/*
 * The express app: every middleware, in the order a request meets them.
 *
 * Its own module so the order can be tested. index.ts hands it the real
 * route table, the built client and a database probe; the unit tests hand it
 * fake routes and a directory of fixture files, and assert on what a caller
 * actually receives - which is how "hashed assets carry Set-Cookie, so the
 * CDN never caches them" becomes a test rather than a finding.
 */
import path from "node:path";
import compression from "compression";
import cors from "cors";
import express, { type Router } from "express";
import helmet from "helmet";

import { applyTrustProxy } from "./client-ip.ts";
import { csrf } from "./csrf.ts";
import { insecureTransport } from "./insecure-transport.ts";
import { apiLimiter, healthLimiter } from "./limits.ts";
import { IMAGE_SOURCES } from "./media.ts";
import { session } from "./session.ts";

export interface AppOptions {
  /* The route table, already built (server/routes.ts in production). */
  router: Router;
  /* Where the built client lives; absent in development. */
  clientDir: string;
  /* Throws when the database cannot be reached. */
  checkDatabase: () => Promise<unknown>;
}

export function createApp({ router, clientDir, checkDatabase }: AppOptions) {
  const app = express();

  /*
   * Where the app is mounted, when it is not at the root of its own host.
   *
   * Serving Facewoof at abera.tech/facewoof works either way: a reverse proxy
   * can strip the prefix before forwarding, or it can pass the path through
   * untouched and let this process mount itself there. Setting BASE_PATH covers
   * the second case, so the choice of proxy does not dictate the deployment.
   *
   * It must match the VITE_BASE_PATH the client bundle was built with.
   */
  const basePath = (process.env.BASE_PATH || "").replace(/\/$/, "");

  // In development the client is served by vite on its own origin and proxies
  // /api here, so no cross-origin request ever reaches this process. In
  // production express serves the built bundle itself, so the API is same
  // origin. Either way nothing needs CORS, and the original `app.use(cors())`
  // opened the API to every website on the internet. It stays available for a
  // deliberately configured origin only.
  if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN.split(",") }));
  }

  // How many proxy hops to believe when working out the caller's address,
  // which every rate limit is keyed on — the in-memory ones and the Postgres
  // store alike, since both take express-rate-limit's default key, req.ip.
  // TRUST_PROXY_HOPS; server/client-ip.ts has the reasoning. Never `true`:
  // that believes whatever X-Forwarded-For a caller sends and hands anyone a
  // fresh identity per request.
  applyTrustProxy(app);

  /*
   * Compress everything compressible on the way out.
   *
   * Container Apps ingress terminates TLS but does not compress, so without
   * this the bundle left the building at its full 680 KB — measured against
   * production, with the browser offering gzip and brotli in every request.
   * The middleware negotiates against Accept-Encoding and skips bodies that
   * are already small or already compressed (the JPEGs), so it costs nothing
   * where it cannot help.
   */
  app.use(compression());

  /*
   * helmet's default Content-Security-Policy is img-src 'self' data:, which
   * blocks every dog photo: the demo roster's images come from placedog.net and
   * uploads come back from Cloudinary. The page rendered with broken image icons
   * in production and looked fine locally, because nothing here was exercised in
   * a browser against the built image until it was deployed.
   *
   * Everything else stays at helmet's defaults. Only the image sources the app
   * actually uses are added, rather than relaxing img-src to https:.
   */
  // helmet does not emit Permissions-Policy; deny the powerful APIs this app
  // never uses. geolocation stays self for the queued location feature.
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(self)",
    );
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // The same list the API holds stored photo URLs to.
          "img-src": ["'self'", "data:", ...IMAGE_SOURCES],
          // Photo uploads POST from the browser straight to Cloudinary. The
          // default connect-src 'self' silently blocked that request, so even a
          // correctly configured uploader could never have worked in
          // production.
          "connect-src": ["'self'", "https://api.cloudinary.com"],
          // Dropped only when the instance is deliberately on plain HTTP: it
          // rewrites every asset URL to https://, which over HTTP fails the
          // bundle outright and renders a blank page.
          ...(insecureTransport ? { "upgrade-insecure-requests": null } : {}),
        },
      },
      // Dropped only then, and for coherence rather than effect: RFC 6797 has
      // browsers ignore an HSTS header that arrives over plain HTTP, so on an
      // insecure instance the header does nothing except mislead whoever is
      // debugging a forced-https failure into blaming it. (The real cause of
      // that failure was the test hostname: `app` is a gTLD on Chromium's HSTS
      // preload list — see compose.yaml.)
      ...(insecureTransport ? { strictTransportSecurity: false } : {}),
    }),
  );

  // Container Apps polls this to decide whether the revision is healthy.
  // Deliberately outside the /api limiter: the platform polls this on a schedule
  // and must never be throttled into reporting a healthy revision as sick.
  app.get("/healthz", healthLimiter, async (_req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: "ok" });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(503).json({ status: "no database", error });
    }
  });

  // Everything below is mounted under basePath, which is '' unless the app is
  // being served from a subdirectory of another host.
  const mount = express.Router();

  /*
   * The session, the body parsers and the CSRF token belong to the API and to
   * nothing else, so they are mounted on /api rather than on the app.
   *
   * They used to sit in front of everything, and lusca sets its XSRF-TOKEN
   * cookie (and with it the session cookie holding the token's secret) on every
   * response it sees. So every hashed asset left with three Set-Cookie headers
   * next to `Cache-Control: public, immutable`, and a shared cache will not
   * store a response that sets a cookie: Cloudflare answered
   * `cf-cache-status: BYPASS` for the whole bundle, on every visit. The
   * document itself was the same. Neither needs a session.
   *
   * The client still has its token before its first write: it asks
   * /api/auth/me on load, which is a GET under /api and so carries the cookie,
   * and src/api.ts fetches one first if a write ever finds the jar empty.
   */
  const apiOnly = express.Router();

  // Before the routes, so every handler can see req.session.
  apiOnly.use(session);

  // Nothing this API accepts is large. The default is 100kb, which is a lot of
  // room for an endpoint whose biggest legitimate body is a short post.
  apiOnly.use(express.json({ limit: "32kb" }));
  apiOnly.use(express.urlencoded({ extended: true, limit: "32kb" }));

  // CSRF, double-submit style; server/csrf.ts has the details. Mounted on
  // /api only, so only API responses carry the token cookie.
  apiOnly.use(csrf);

  // A backstop across the whole API. The per-endpoint limits in routes.ts are
  // what actually matter; this catches anything added later without one.
  apiOnly.use(apiLimiter);

  mount.use("/api", apiOnly);
  mount.use(router);

  // Serve the built client, and hand any unmatched path to index.html so that
  // react-router owns client side routes on a hard refresh. Only mounted when a
  // build exists, which it does in the production image and does not in dev.
  //
  // Everything under assets/ carries a content hash in its name, so a change is
  // a new URL and the old one can be cached forever. The default max-age=0 made
  // every return visit re-validate each asset — one conditional request per
  // file, for files that cannot have changed. The document is the opposite
  // case: it is where the hashed names come from, so it must always be
  // revalidated. `no-cache` allows caching but forces the conditional request,
  // which the etag answers with a 304.
  const documentCaching = { "Cache-Control": "no-cache" };
  mount.use(
    express.static(clientDir, {
      setHeaders: (res, filePath) => {
        if (filePath.startsWith(path.join(clientDir, "assets") + path.sep)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(`${path.sep}index.html`)) {
          res.setHeader("Cache-Control", documentCaching["Cache-Control"]);
        }
      },
    }),
  );
  // Written as middleware rather than a '*' route: express 5 moved to
  // path-to-regexp v8, which rejects a bare '*' and would need '/*splat'.
  mount.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(
      path.join(clientDir, "index.html"),
      { headers: documentCaching },
      (err) => (err ? next() : undefined),
    );
  });

  app.use(basePath || "/", mount);

  return app;
}
