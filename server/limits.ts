import { rateLimit } from "express-rate-limit";

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
 */

const minutes = (n: number) => n * 60 * 1000;

const shared = {
  standardHeaders: "draft-7", // RateLimit-* response headers
  legacyHeaders: false,
} as const;

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

export const guestLimiter = rateLimit({
  ...shared,
  windowMs: minutes(60),
  limit: GUEST_LIMIT_PER_HOUR,
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

/* A backstop over the whole API, generous enough never to catch normal use. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: minutes(5),
  limit: 600,
  message: { error: "Too many requests. Try again shortly." },
});
