const { addToPack, getPacks, createPackAndAdd } = require('../db');

/*
 * Add a user to an existing pack.
 *
 * The original read req.params on a route that declares no parameters
 * (PUT /api/addtopack), so both values were always undefined and the insert
 * silently wrote a row of nulls. They come from the body.
 */
const addUserToPack = (req, res) => {
  const { user_id: userId, pack_id: packId } = req.body;

  if (!userId || !packId) {
    return res.status(400).send('user_id and pack_id are required');
  }

  return addToPack(userId, packId)
    .then(() => res.status(201).send('Added to pack'))
    .catch((err) => {
      console.error('error adding to pack', err);
      res.status(500).send('Error adding to pack');
    });
};

const createNewPackAndAdd = (req, res) => {
  const { pack_name: packName } = req.body;
  let { users } = req.body;

  // The original always called JSON.parse, which threw whenever the client
  // sent a real JSON array rather than a string holding one.
  if (typeof users === 'string') {
    try {
      users = JSON.parse(users);
    } catch {
      return res.status(400).send('users must be an array of user ids');
    }
  }

  if (!packName || !Array.isArray(users) || users.length === 0) {
    return res.status(400).send('pack_name and a non-empty users array are required');
  }

  return createPackAndAdd(packName, users.map(Number))
    .then(() => res.status(201).send('Pack created'))
    .catch((err) => {
      console.error('error creating pack', err);
      res.status(500).send('Error creating pack');
    });
};

const getUserPacks = (req, res) =>
  getPacks(req.query.userId)
    .then((data) => res.send(data.rows[0]?.json_agg ?? []))
    .catch((err) => {
      console.error('unable to get packs', err);
      res.status(500).send('unable to get packs');
    });

module.exports = { addUserToPack, getUserPacks, createNewPackAndAdd };
