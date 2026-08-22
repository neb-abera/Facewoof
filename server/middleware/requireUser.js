/*
 * Establish who is calling, from the session rather than from the request.
 *
 * `req.userId` is the only thing controllers should treat as the acting user.
 * Anything still arriving in a query string or body is a target — the dog being
 * swiped on, the pack being posted to — and has to be authorised separately.
 */
const requireUser = (req, res, next) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).send('sign in first');
  }

  req.userId = Number(userId);
  return next();
};

module.exports = { requireUser };
