const { getAllPlaydates, createPlaydate } = require('../db');

const getPlaydates = (req, res) => {
  const { userId } = req.query;

  return getAllPlaydates(userId)
    .then((data) => {
      console.log(data.rows[0].pack_playdates);
      res.send(data.rows[0].pack_playdates);
    })
    .catch((err) => console.log(err));
};

module.exports = {
  getPlaydates: getPlaydates
};
