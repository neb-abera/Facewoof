import type { RequestHandler } from "express";
import zipcodes from "zipcodes";
import {
  checkForMatchAndCreate,
  countRemainingFeed,
  generateDiscoverFeed,
  getUserLocation,
  setRelationship,
} from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";

// The feed is served a page at a time. Ten is enough that the client always
// has cards in hand while the next page is in flight, and small enough that
// nobody downloads ninety profiles to look at four.
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;

// `seen` is supplied by the client and bounds a query, so it needs a ceiling.
const MAX_SEEN = 500;

const parseSeen = (raw: unknown): number[] =>
  String(raw || "")
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

export function resolveZip(
  location: unknown,
  nearZip: string | null,
): string | null {
  const query = String(location || "").trim();
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
  const knowWhereTheyAre =
    Boolean(nearZip) && Boolean(nearZip && zipcodes.lookup(nearZip));

  const ranked = candidates.sort((a, b) => {
    const zipA = a[0]?.zip;
    const zipB = b[0]?.zip;
    if (knowWhereTheyAre && nearZip && zipA && zipB) {
      const distanceA = zipcodes.distance(nearZip, zipA);
      const distanceB = zipcodes.distance(nearZip, zipB);
      if (distanceA !== null && distanceB !== null && distanceA !== distanceB) {
        return distanceA - distanceB;
      }
    }
    return b.length - a.length;
  });

  return ranked[0]?.[0]?.zip ?? null;
}

export const discoverUsers: RequestHandler = async (req, res) => {
  try {
    // From the body, not the query string: a URL is copied into too many
    // places (logs, history, Referer) to carry someone's location.
    const { zipcode, radius, limit } = req.body;
    const id = actingUser(req);
    const seen = parseSeen(req.body.seen);
    const pageSize = Math.min(
      Number(limit) || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    // Only needed to settle an ambiguous city name, but it is a primary key
    // lookup and the feed query that follows dwarfs it.
    const nearZip = await getUserLocation(id);
    const origin = resolveZip(zipcode, nearZip);
    if (!origin) {
      // The input is deliberately not echoed back: the old template string
      // reflected the raw query into a text/html-typed body, which is a
      // textbook reflected XSS (CodeQL js/reflected-xss).
      res.status(400).json({
        error: "could not resolve a location from that zipcode or city",
      });
      return;
    }

    const miles = Number(radius) || 5;
    const nearbyZips = zipcodes.radius(origin, miles) as string[];

    const distances: Record<string, number | null> = {};
    for (const zip of nearbyZips) {
      distances[zip] = zipcodes.distance(origin, zip);
    }

    const nearbyUsers = await generateDiscoverFeed(
      id,
      nearbyZips,
      pageSize,
      seen,
    );

    // What is left after this page, so the client knows whether to keep
    // asking. Counted rather than inferred from a short page: a full page can
    // still be the last one.
    const delivered = seen.concat(nearbyUsers.map((u) => u.user_id));
    const remaining = await countRemainingFeed(id, nearbyZips, delivered);

    res.status(200).send({ users: nearbyUsers, distances, origin, remaining });
  } catch (err) {
    console.error("unable to retrieve matched users", err);
    res.status(500).send("Unable to retrieve matched users");
  }
};

export const userResponse: RequestHandler = async (req, res) => {
  // The swiper is whoever holds the session. Only the dog being swiped on
  // comes from the request, and swiping on yourself is not a thing.
  const currentUserId = actingUser(req);
  const { otherUserId, currentUserChoice, otherUserChoice } = req.body;

  if (!otherUserId || Number(otherUserId) === currentUserId) {
    res.status(400).send("otherUserId is required and must be someone else");
    return;
  }

  try {
    if (currentUserChoice !== otherUserChoice) {
      await setRelationship(
        currentUserId,
        Number(otherUserId),
        Boolean(currentUserChoice),
      );
      res.status(201).send("Response updated");
      return;
    }
    await checkForMatchAndCreate(currentUserId, Number(otherUserId));
    res
      .status(200)
      .send({ message: "Match found", matchedUserId: otherUserId });
  } catch (err) {
    console.error("unable to update response", err);
    res.status(500).send("Unable to update response");
  }
};

/*
 * Turn browser geolocation coordinates into a zip code.
 *
 * This was the Google Geocoding API, called from the browser with the key
 * embedded in the bundle. The local zip table answers it without a key, a
 * network round trip, or a key to leak.
 */
export const resolveLocation: RequestHandler = (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).send("lat and lng are required");
    return;
  }

  const match = zipcodes.lookupByCoords(lat, lng);
  if (!match) {
    res.status(404).send("no US zip code near those coordinates");
    return;
  }
  res
    .status(200)
    .send({ zip: match.zip, city: match.city, state: match.state });
};
