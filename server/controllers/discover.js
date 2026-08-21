const zipcodes = require('zipcodes');
const { generateDiscoverFeed, setRelationship, checkForMatchAndCreate } = require('../db');

/*
 * Resolve whatever the search box was given into a zip code.
 *
 * Accepts a zip code ("10011") or a place ("Brooklyn, NY", "Hoboken"). The
 * original sent this to the Google Geocoding API and the zip radius to
 * zipcodeapi.com, so running the app at all needed two paid API keys and
 * network round trips on every search. The `zipcodes` package carries the US
 * zip code table locally, which answers both questions offline.
 */
// Two letter codes only: the table is keyed both ways, by abbreviation and by
// full state name.
const STATES = Object.keys(zipcodes.states).filter((key) => key.length === 2);

function resolveZip(location) {
  const query = String(location || '').trim();
  if (!query) return null;

  if (/^\d{5}$/.test(query)) {
    return zipcodes.lookup(query) ? query : null;
  }

  const [city, state] = query.split(',').map((part) => part.trim());

  if (state) {
    const matches = zipcodes.lookupByName(city, state);
    return matches && matches.length ? matches[0].zip : null;
  }

  // lookupByName throws without a state, so a bare city name has to be tried
  // against each one. A scan of the table per state, only on a city search.
  const hit = STATES.map((candidate) => zipcodes.lookupByName(city, candidate)).find(
    (matches) => matches && matches.length
  );
  return hit ? hit[0].zip : null;
}

const discoverUsers = async (req, res) => {
  try {
    const { id, zipcode, radius, count } = req.query;

    if (!id) {
      return res.status(400).send('id is required');
    }

    const origin = resolveZip(zipcode);
    if (!origin) {
      return res.status(400).send(`could not resolve a location from "${zipcode}"`);
    }

    const miles = Number(radius) || 5;
    const nearbyZips = zipcodes.radius(origin, miles);

    const distances = {};
    nearbyZips.forEach((zip) => {
      distances[zip] = zipcodes.distance(origin, zip);
    });

    const nearbyUsers = await generateDiscoverFeed(Number(id), nearbyZips, Number(count) || 100);
    return res.status(200).send({ users: nearbyUsers, distances, origin });
  } catch (err) {
    console.error('unable to retrieve matched users', err);
    return res.status(500).send('Unable to retrieve matched users');
  }
};

const userResponse = async (req, res) => {
  const { currentUserId, otherUserId, currentUserChoice, otherUserChoice } = req.body;
  try {
    if (currentUserChoice !== otherUserChoice) {
      await setRelationship(currentUserId, otherUserId, currentUserChoice);
      return res.status(201).send('Response updated');
    }
    await checkForMatchAndCreate(currentUserId, otherUserId);
    return res.status(200).send({ message: 'Match found', matchedUserId: otherUserId });
  } catch (err) {
    console.error('unable to update response', err);
    return res.status(500).send('Unable to update response');
  }
};

/*
 * Turn browser geolocation coordinates into a zip code.
 *
 * This was the Google Geocoding API, called from the browser with the key
 * embedded in the bundle. The local zip table answers it without a key, a
 * network round trip, or a key to leak.
 */
const resolveLocation = (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).send('lat and lng are required');
  }

  const match = zipcodes.lookupByCoords(lat, lng);
  if (!match) {
    return res.status(404).send('no US zip code near those coordinates');
  }
  return res.status(200).send({ zip: match.zip, city: match.city, state: match.state });
};

module.exports = { discoverUsers, userResponse, resolveLocation };
