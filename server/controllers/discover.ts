import zipcodes from "zipcodes";
import { defineRoute, reply } from "../api/route.ts";
import {
  Coordinates,
  DiscoverBody,
  DiscoverPage,
  ErrorBody,
  MatchFound,
  Message,
  ResolvedLocation,
  SwipeBody,
} from "../api/schemas.ts";
import {
  checkForMatchAndCreate,
  discoverFeedPage,
  getUserLocation,
  setRelationship,
} from "../db/index.ts";
import { feedLimiter, swipeLimiter } from "../limits.ts";

// The feed is served a page at a time. Ten is enough that the client always
// has cards in hand while the next page is in flight, and small enough that
// nobody downloads ninety profiles to look at four.
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;

// `seen` is supplied by the client and bounds a query, so it needs a ceiling.
const MAX_SEEN = 500;

const parseSeen = (raw: string | undefined): number[] =>
  (raw ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, MAX_SEEN);

/*
 * Resolve whatever the search box was given into a zip code.
 *
 * Accepts a zip code ("10011") or a place ("Brooklyn, NY", "Hoboken"). The
 * original sent this to the Google Geocoding API and the zip radius to
 * zipcodeapi.com, so running the app at all needed two paid API keys and
 * network round trips on every search. The `zipcodes` package carries the US
 * zip code table locally, which answers both questions offline.
 *
 * `nearZip` is where the person searching already is, used to settle a bare
 * city name that exists in more than one state.
 */
// zipcodes.states is { full, abbr, normalize }, not a map of codes: `abbr` is
// the one keyed by the two letter abbreviations.
const STATES = Object.keys(zipcodes.states.abbr);

/*
 * Whether resolveZip() will consult `nearZip` for this query: only for a
 * place name with no state. A zip code or "City, ST" is settled without it.
 */
export const needsOrigin = (location: string): boolean => {
  const query = location.trim();
  if (!query || /^\d{5}$/.test(query)) return false;
  return !query.split(",")[1]?.trim();
};

export function resolveZip(
  location: string,
  nearZip: string | null,
): string | null {
  const query = location.trim();
  if (!query) return null;

  if (/^\d{5}$/.test(query)) {
    return zipcodes.lookup(query) ? query : null;
  }

  const [city = "", state] = query.split(",").map((part) => part.trim());

  if (state) {
    const matches = zipcodes.lookupByName(city, state);
    return matches?.[0]?.zip ?? null;
  }

  // lookupByName throws without a state, so a bare city name has to be tried
  // against each one.
  const candidates = STATES.map((candidate) =>
    zipcodes.lookupByName(city, candidate),
  ).filter((matches) => matches?.length);

  if (!candidates.length) return null;

  // The same city name turns up in several states, and taking the first
  // alphabetically is how "Hoboken" becomes Hoboken, Georgia. Prefer whichever
  // is nearest the person searching, and fall back to the one covering the
  // most zip codes, which is a reasonable stand-in for the largest place.
  const origin = nearZip && zipcodes.lookup(nearZip) ? nearZip : null;

  const ranked = candidates.sort((a, b) => {
    const zipA = a[0]?.zip;
    const zipB = b[0]?.zip;
    if (origin && zipA && zipB) {
      const distanceA = zipcodes.distance(origin, zipA);
      const distanceB = zipcodes.distance(origin, zipB);
      if (distanceA !== null && distanceB !== null && distanceA !== distanceB) {
        return distanceA - distanceB;
      }
    }
    return b.length - a.length;
  });

  return ranked[0]?.[0]?.zip ?? null;
}

export const discoverUsers = defineRoute({
  method: "post",
  path: "/api/discover",
  summary: "A page of dogs near a zip code or place",
  auth: true,
  limit: feedLimiter,
  // POST, not GET, on purpose: the payload is the caller's location, and a
  // query string would copy it into access logs, proxy logs, Referer headers
  // and browser history on every request (CodeQL js/sensitive-get-query).
  body: DiscoverBody,
  responses: { 200: DiscoverPage, 400: ErrorBody },
  handler: async ({ userId, body }) => {
    const seen = parseSeen(body.seen);
    const pageSize = Math.min(body.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Where the searcher is only matters for settling a bare city name that
    // exists in several states. The client sends a zip code on every page of
    // the feed, so asking the database first was a round trip per request
    // for an answer resolveZip() then ignored.
    const nearZip = needsOrigin(body.zipcode)
      ? await getUserLocation(userId)
      : null;
    const origin = resolveZip(body.zipcode, nearZip);
    if (!origin) {
      // The input is deliberately not echoed back: the old template string
      // reflected the raw query into a text/html-typed body, which is a
      // textbook reflected XSS (CodeQL js/reflected-xss).
      return reply(400, {
        error: "could not resolve a location from that zipcode or city",
      });
    }

    const miles = body.radius ?? 5;
    const nearbyZips = zipcodes.radius(origin, miles) as string[];

    // `remaining` is what is left after this page, so the client knows
    // whether to keep asking. Counted rather than inferred from a short page:
    // a full page can still be the last one.
    const { users: rows, remaining } = await discoverFeedPage(
      userId,
      nearbyZips,
      pageSize,
      seen,
    );

    // The card carries a whole-mile distance and never the zip code it was
    // computed from: the number is all the UI shows, and a member's zip is
    // theirs. (zipcodes.distance already rounds to whole miles.)
    const users = rows.map(({ location, ...card }) => ({
      ...card,
      distance: location ? zipcodes.distance(origin, location) : null,
    }));

    return reply(200, { users, origin, remaining });
  },
});

export const userResponse = defineRoute({
  method: "post",
  path: "/api/response",
  summary: "Record a swipe; a reciprocated yes becomes a match",
  auth: true,
  limit: swipeLimiter,
  body: SwipeBody,
  responses: { 200: MatchFound, 201: Message, 400: ErrorBody },
  handler: async ({ userId, body }) => {
    // The swiper is whoever holds the session. Only the dog being swiped on
    // comes from the request, and swiping on yourself is not a thing.
    if (body.otherUserId === userId) {
      return reply(400, {
        error: "otherUserId is required and must be someone else",
      });
    }

    if (body.currentUserChoice !== body.otherUserChoice) {
      await setRelationship(userId, body.otherUserId, body.currentUserChoice);
      return reply(201, { message: "Response updated" });
    }
    await checkForMatchAndCreate(userId, body.otherUserId);
    return reply(200, {
      message: "Match found",
      matchedUserId: body.otherUserId,
    });
  },
});

/*
 * Turn browser geolocation coordinates into a zip code.
 *
 * This was the Google Geocoding API, called from the browser with the key
 * embedded in the bundle. The local zip table answers it without a key, a
 * network round trip, or a key to leak.
 */
export const resolveLocation = defineRoute({
  method: "post",
  path: "/api/resolve-location",
  summary: "The US zip code nearest a pair of coordinates",
  auth: true,
  body: Coordinates,
  responses: { 200: ResolvedLocation, 404: ErrorBody },
  handler: async ({ body }) => {
    const match = zipcodes.lookupByCoords(body.lat, body.lng);
    if (!match) {
      return reply(404, { error: "no US zip code near those coordinates" });
    }
    return reply(200, { zip: match.zip, city: match.city, state: match.state });
  },
});
