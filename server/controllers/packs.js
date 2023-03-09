const axios = require('axios');
require('dotenv').config();

const { addToPack, getPacks } = require('../db');

const addUserToPack = (req, res) => {
  const { user_id, pack_id } = req.params;

  return addToPack(user_id, pack_id)
    .then(() => {
      res.status(201).send('Added to pack');
    })
    .catch((err) => {
      res.status(404).send('Error adding to pack');
    });
};

const getUserPacks = (req, res) => {
  const { userId } = req.query;

  return getPacks(userId).then((data) => {
    // console.log(data.rows[0]);
    res.send(data.rows[0].json_agg);
  });
};

module.exports = {
  addUserToPack: addUserToPack,
  getUserPacks: getUserPacks
};
