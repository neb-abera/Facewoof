const axios = require('axios');
require('dotenv').config();

const { addToPack } = require('../db');

const addUserToPack = (req, res) => {
  const { user_id, pack_id } = req.params;

  return addToPack(user_id, pack_id)
    .then(() => {
      res.status(201).send('Added to pack');
    })
    .catch((err) => {
      res.status(404).send('Error adding to pack');
    });
}

module.exports = {
  addUserToPack,
};
