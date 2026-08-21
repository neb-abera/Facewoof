const rateLimit = require('express-rate-limit');

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
 */

const minutes = (n) => n * 60 * 1000;

const shared = {
  standardHeaders: 'draft-7', // RateLimit-* response headers
  legacyHeaders: false
};

/*
 * Creating a demo account writes a hundred profiles and three hundred photo
 * rows. It is by far the most expensive thing an anonymous caller can ask for,
 * so it is the tightest limit here.
 */
const guestLimiter = rateLimit({
  ...shared,
  windowMs: minutes(60),
  limit: 10,
  message: 'Too many demo sessions started from this address. Try again in an hour.'
});

/*
 * Swiping. A quick human manages perhaps two a second in short bursts; this
 * allows that sustained for a minute, which no one does, and stops a loop
 * that would otherwise write thousands of rows.
 */
const swipeLimiter = rateLimit({
  ...shared,
  windowMs: minutes(1),
  limit: 120,
  message: 'Slow down a moment.'
});

/*
 * Reading the feed. Paged at ten a time and topped up as cards are swiped, so
 * normal use is well under this even for someone swiping flat out.
 */
const feedLimiter = rateLimit({
  ...shared,
  windowMs: minutes(1),
  limit: 60,
  message: 'Too many requests. Try again shortly.'
});

/* Anything that writes content: posts, playdates, photos, profile edits. */
const writeLimiter = rateLimit({
  ...shared,
  windowMs: minutes(10),
  limit: 100,
  message: 'Too many changes from this address. Try again shortly.'
});

/* A backstop over the whole API, generous enough never to catch normal use. */
const apiLimiter = rateLimit({
  ...shared,
  windowMs: minutes(5),
  limit: 600,
  message: 'Too many requests. Try again shortly.'
});

module.exports = { guestLimiter, swipeLimiter, feedLimiter, writeLimiter, apiLimiter };
