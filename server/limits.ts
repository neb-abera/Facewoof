import { type Options, rateLimit } from "express-rate-limit";
import { pool } from "./db/database.ts";
import { PostgresStore } from "./rate-limit-store.ts";
import { securityEvent } from "./security-log.ts";

/*
 * Rate limits.
 *
 * Swiping is a fast, repetitive action, so a limit tight enough to stop a
 * script is also tight enough to catch an enthusiastic person. The limits
 * below are set well above what a human hand can produce and well below what a
 * loop can, and the expensive endpoints are held much tighter than the cheap
 * ones.
 *
 * Everything is keyed on IP, which is the only identifier available: there is
 * no authentication yet, and a user id is supplied by the caller and therefore
 * worthless as a key.
 *
 * A limiter answers 429 with the same `{ error }` JSON body every other
 * refusal uses, so a client has one shape to read.
 *
 * Where the counts live. Production runs one to three replicas, and a count
 * kept in a process's memory is per replica and gone with the revision: a
 * limit of N is up to 3N, reset by every deploy. The guest limiter keeps its
 * counts in Postgres (server/rate-limit-store.ts) so that it means what it
 * says. The others deliberately do not:
 *
 *   - they guard the hot paths - every swipe, every page of the feed, every
 *     API request at all for the backstop - and a shared count is a database
 *     write in front of each of those, two for most, to protect reads that
 *     cost less than the write would;
 *   - their windows are a minute to ten, so what a deploy forgets is minutes
 *     of counting, and 3x a limit set far above human use is still far below
 *     what a loop needs;
 *   - the health probe must answer when the database is down, which is the
 *     one thing it exists to report.
 *
 * The guest limiter is the opposite on every count: an hour's window, a
 * limit of ten where thirty matters, and in front of the most expensive
 * thing an anonymous caller can ask for - which writes four hundred rows, so
 * one more is nothing.
 */

const minutes = (n: number) => n * 60 * 1000;

const shared = {
  standardHeaders: "draft-7", // RateLimit-* response headers
  legacyHeaders: false,
  // The library's own reply, plus a security event: a limiter firing is the
  // first sign of a loop, a scraper or a guessing attack.
  handler: (req, res, _next, options) => {
    securityEvent(req, "rate_limit.hit");
    res.status(options.statusCode).json(options.message);
  },
} as const satisfies Partial<Options>;

/*
 * Creating a demo account writes a hundred profiles and three hundred photo
 * rows. It is by far the most expensive thing an anonymous caller can ask for,
 * so it is the tightest limit here.
 */
// Configurable because the browser tests all arrive from one address: five
// tests that each sign in, times a retry, is already at the default. A suite
// tripping a rate limit looks like a broken app rather than a working control.
// Production leaves it at the default.
//
// Exported for the unit tests: the parsed number is the behavior worth
// pinning, and the middleware object does not expose it.
export const GUEST_LIMIT_PER_HOUR =
  Number(process.env.GUEST_LIMIT_PER_HOUR) || 10;

/*
 * A ceiling on demo accounts alive at once, whoever asked for them. The
 * limiter above is per address, and addresses are cheap: a few hundred of
 * them could each stay under it and still fill the database with a hundred
 * rows apiece, faster than the daily sweep empties it. 1000 accounts is about
 * a hundred thousand profile rows — far more demos than this site has ever
 * had in a day, and a size the smallest Postgres tier holds comfortably.
 */
export const GUEST_MAX_LIVE = Number(process.env.GUEST_MAX_LIVE) || 1000;

export const guestLimiter = rateLimit({
  ...shared,
  windowMs: minutes(60),
  limit: GUEST_LIMIT_PER_HOUR,
  // Shared by every replica, and kept across deploys. If the database cannot
  // be reached the limiter refuses (the default, passOnStoreError: false),
  // which costs nothing: the route behind it needs the database too.
  store: new PostgresStore(pool, "guest"),
  message: {
    error:
      "Too many demo sessions started from this address. Try again in an hour.",
  },
});

/*
 * Swiping. A quick human manages perhaps two a second in short bursts; this
 * allows that sustained for a minute, which no one does, and stops a loop
 * that would otherwise write thousands of rows.
 */
export const swipeLimiter = rateLimit({
  ...shared,
  windowMs: minutes(1),
  limit: 120,
  message: { error: "Slow down a moment." },
});

/*
 * Reading the feed. Paged at ten a time and topped up as cards are swiped, so
 * normal use is well under this even for someone swiping flat out.
 */
export const feedLimiter = rateLimit({
  ...shared,
  windowMs: minutes(1),
  limit: 60,
  message: { error: "Too many requests. Try again shortly." },
});

/* Anything that writes content: posts, playdates, photos, profile edits. */
export const writeLimiter = rateLimit({
  ...shared,
  windowMs: minutes(10),
  limit: 100,
  message: { error: "Too many changes from this address. Try again shortly." },
});

/*
 * Upload signatures. Each one is a permission to store a file on the
 * deployment's Cloudinary account, so it is held far tighter than writes in
 * general: nobody adds twenty photos in ten minutes.
 */
export const uploadLimiter = rateLimit({
  ...shared,
  windowMs: minutes(10),
  limit: 20,
  message: { error: "Too many uploads from this address. Try again shortly." },
});

/*
 * The health probe is deliberately outside the /api limiter so the platform
 * can never be throttled into reporting a healthy revision as sick — but it
 * does hit the database, so it gets its own ceiling far above any poller
 * (Container Apps probes every few seconds at most) and far below a loop.
 */
export const healthLimiter = rateLimit({
  ...shared,
  windowMs: minutes(1),
  limit: 60,
  message: { error: "Too many health checks." },
});

/*
 * The cheap anonymous routes: which providers this instance offers, sign-out,
 * and the OIDC callback. None of them writes anything on its own account (the
 * callback only gets as far as a write once Entra has issued a code), so they
 * need nothing like the guest limiter's hour in Postgres. They used to have no
 * limiter at all and lean on the /api backstop, which exists to catch a route
 * added without one, not to be one: every anonymous route carries a limit of
 * its own, and tests/unit/routes.test.ts holds the table to that. Sixty a
 * minute is more sign-ins and sign-outs than a person manages and far fewer
 * than a loop probing the callback's state check would want.
 *
 * Exported for that test, like GUEST_LIMIT_PER_HOUR.
 */
export const PUBLIC_LIMIT_PER_MINUTE = 60;

export const publicLimiter = rateLimit({
  ...shared,
  windowMs: minutes(1),
  limit: PUBLIC_LIMIT_PER_MINUTE,
  message: { error: "Too many requests. Try again shortly." },
});

/* A backstop over the whole API, generous enough never to catch normal use. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: minutes(5),
  limit: 600,
  message: { error: "Too many requests. Try again shortly." },
});
