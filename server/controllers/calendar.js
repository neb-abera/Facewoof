const { getAllPlaydates, createPlaydate, getPacks } = require('../db');

const getPlaydates = (req, res) => {
  const { userId } = req.query;

  return getAllPlaydates(userId)
    .then((data) => {
      // console.log(data.rows[0].pack_playdates);
      res.send(data.rows[0].pack_playdates);
    })
    .catch((err) => console.log(err));
};

const getUserPacks = (req, res) => {
  const { userId } = req.query;

  return getPacks(userId).then((data) => {
    // console.log(data.rows[0]);
    res.send(data.rows[0].json_agg);
  });
};

module.exports = {
  getPlaydates: getPlaydates,
  getUserPacks: getUserPacks
};
