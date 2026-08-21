/* eslint-disable no-console */
const path = require('path');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('./db/database');
const { purgeExpiredGuests } = require('./db/auth');
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Container Apps polls this to decide whether the revision is healthy.
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
mount.use(express.static(clientDir));
// Written as middleware rather than a '*' route: express 5 moved to
// path-to-regexp v8, which rejects a bare '*' and would need '/*splat'.
mount.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(clientDir, 'index.html'), (err) => (err ? next() : undefined));
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
