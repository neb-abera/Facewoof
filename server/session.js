const crypto = require('crypto');
const cookieSession = require('cookie-session');

/*
 * Who the caller is, held in a signed cookie.
 *
 * Every endpoint used to take the acting user's id as a query parameter or a
 * body field, which meant anyone could act as anyone by changing a number in a
 * URL. The id comes from here instead, and the cookie is signed, so the client
 * can read it but cannot forge it.
 *
 * A cookie rather than a server-side store on purpose: Container Apps runs
 * several replicas behind a load balancer with no session affinity, so a store
 * would have to be shared infrastructure. There is nothing in the session but
 * a user id, so there is nothing worth keeping server-side.
 */
const isProduction = process.env.NODE_ENV === 'production';

// A generated key means restarting signs everyone out, which is fine for a
// demo and wrong for production, where replicas would each generate their own
// and reject each other's cookies.
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

module.exports = cookieSession({
  name: 'facewoof.sid',
  keys: [secret],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true, // not readable from JavaScript, so XSS cannot lift it
  sameSite: 'lax', // sent on normal navigation, not on cross-site form posts
  secure: isProduction // HTTPS only once deployed
});
