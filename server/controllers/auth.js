const zipcodes = require("zipcodes");
const { createGuestUser, getCurrentUserPromise } = require("../db");

/*
 * Hand a demo visitor their own throwaway account, and the demo roster placed
 * next to them.
 *
 * Takes a zip code, or coordinates from the browser, so the dogs are near the
 * person looking. Neither is required: without them the demo lands on its
 * default city rather than failing.
 */
const guestLogin = (req, res) => {
  const { zip, lat, lng } = req.body || {};
  let originZip = zip;

  if (
    !originZip &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  ) {
    const match = zipcodes.lookupByCoords(Number(lat), Number(lng));
    if (match) originZip = match.zip;
  }

  return createGuestUser(originZip)
    .then((user) => {
      // Signing in is what establishes the session. Everything after this
      // takes the caller's identity from the cookie rather than the request.
      req.session.userId = user.user_id;
      return res.status(201).send(user);
    })
    .catch((err) => {
      console.error("unable to create guest account", err);
      res.status(500).send("unable to create guest account");
    });
};

/* Who the caller is, according to their session. */
const me = (req, res) =>
  getCurrentUserPromise(req.userId)
    .then(({ rows }) => {
      if (!rows.length) {
        // The account is gone: an expired guest swept up by the cleanup. Clear
        // the cookie rather than leaving them signed in to nothing.
        req.session = null;
        return res.status(401).send("sign in first");
      }
      return res.status(200).send(rows[0]);
    })
    .catch((err) => {
      console.error("unable to load the current user", err);
      res.status(500).send("unable to load the current user");
    });

const logout = (req, res) => {
  req.session = null;
  res.status(204).end();
};

module.exports = { guestLogin, me, logout };
