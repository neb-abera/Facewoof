const { getAllPlaydates, createPlaydate } = require('../db');

const getPlaydates = (req, res) =>
  getAllPlaydates(req.userId)
    // json_agg gives back one row holding NULL when the user is in no packs.
    .then((data) => res.send(data.rows[0]?.pack_playdates ?? []))
    .catch((err) => {
      console.error('unable to get playdates', err);
      res.status(500).send('unable to get playdates');
    });

const AddPlaydate = (req, res) => {
  const { packId, playdateBody, startTime, endTime } = req.body;
  const { userId } = req;

  if (!packId || !startTime || !endTime) {
    return res.status(400).send('packId, startTime and endTime are required');
  }

  return createPlaydate({ packId, userId, playdateBody, startTime, endTime })
    .then(() => res.status(201).send('playdate added'))
    .catch((err) => {
      console.error('unable to create playdate', err);
      res.status(500).send('unable to create playdate');
    });
};

module.exports = { getPlaydates, AddPlaydate };
