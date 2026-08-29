/* eslint-disable no-console */
const path = require('path');
const compression = require('compression');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

const db = require('./db/database');
const { purgeExpiredGuests } = require('./db/auth');
const { migrate } = require('./db/migrate');
const { apiLimiter } = require('./limits');
const session = require('./session');
const { insecureTransport } = require('./insecure-transport');
const router = require('./routes');

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientDir = path.join(__dirname, '../dist');

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
const basePath = (process.env.BASE_PATH || '').replace(/\/$/, '');

// In development the client is served by vite on its own origin and proxies
// /api here, so no cross-origin request ever reaches this process. In
// production express serves the built bundle itself, so the API is same
// origin. Either way nothing needs CORS, and the original `app.use(cors())`
// opened the API to every website on the internet. It stays available for a
// deliberately configured origin only.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }));
}

/*
 * Trust exactly one proxy hop.
 *
 * Container Apps terminates TLS and forwards, so without this every request
 * appears to come from the ingress and the rate limits below would be shared
 * by everyone at once. `true` would be worse than nothing: it makes express
 * believe whatever X-Forwarded-For a caller sends, which hands anyone a way to
 * forge a fresh identity per request and walk straight through the limits.
 */
app.set('trust proxy', 1);

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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https://placedog.net', 'https://res.cloudinary.com'],
        // Dropped only when the instance is deliberately on plain HTTP: it
        // rewrites every asset URL to https://, which over HTTP fails the
        // bundle outright and renders a blank page.
        ...(insecureTransport ? { 'upgrade-insecure-requests': null } : {})
      }
    }
  })
);

// Before the routes, so every handler can see req.session.
app.use(session);

// Nothing this API accepts is large. The default is 100kb, which is a lot of
// room for an endpoint whose biggest legitimate body is a short post.
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// A backstop across the whole API. The per-endpoint limits in routes.js are
// what actually matter; this catches anything added later without one.
app.use('/api', apiLimiter);

// Container Apps polls this to decide whether the revision is healthy.
// Deliberately outside the /api limiter: the platform polls this on a schedule
// and must never be throttled into reporting a healthy revision as sick.
app.get('/healthz', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'no database', error: err.message });
  }
});

// Everything below is mounted under basePath, which is '' unless the app is
// being served from a subdirectory of another host.
const mount = express.Router();

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
const documentCaching = { 'Cache-Control': 'no-cache' };
mount.use(
  express.static(clientDir, {
    setHeaders: (res, filePath) => {
      if (filePath.startsWith(path.join(clientDir, 'assets') + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith(`${path.sep}index.html`)) {
        res.setHeader('Cache-Control', documentCaching['Cache-Control']);
      }
    }
  })
);
// Written as middleware rather than a '*' route: express 5 moved to
// path-to-regexp v8, which rejects a bare '*' and would need '/*splat'.
mount.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(clientDir, 'index.html'), { headers: documentCaching }, (err) =>
    err ? next() : undefined
  );
});

app.use(basePath || '/', mount);

// Guest accounts are throwaway. Sweep the expired ones hourly rather than
// letting the table grow for as long as the app is up.
const GUEST_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const sweepGuests = () =>
  purgeExpiredGuests(Number(process.env.GUEST_TTL_HOURS) || 24)
    .then(({ rowCount }) => {
      if (rowCount) console.log(`purged ${rowCount} expired guest account(s)`);
    })
    .catch((err) => console.error('guest sweep failed', err));

// Only listen when run directly, so tests can import the app without binding.
if (require.main === module) {
  db.query('SELECT 1')
    // Bring the schema up to date before serving. The runner takes an advisory
    // lock, so several replicas starting at once on a deploy is safe: one
    // applies, the rest wait and find nothing to do.
    .then(() => migrate())
    .then(() => {
      console.log('database connected');
      sweepGuests();
      setInterval(sweepGuests, GUEST_SWEEP_INTERVAL_MS).unref();
      app.listen(port, () => console.log(`Server started on port ${port}`));
    })
    .catch((err) => {
      console.error('could not reach the database:', err.message);
      process.exit(1);
    });
}

module.exports = app;
