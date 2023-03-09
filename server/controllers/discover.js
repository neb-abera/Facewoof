const axios = require('axios');
const { readFile } = require('node:fs/promises');
const { join } = require('path');
require('dotenv').config();
const { generateDiscoverFeed, setRelationship, checkForMatchAndCreate } = require('../db');

const apiKey = process.env.ZIPCODE_APIKEY;
const url = process.env.ZIPCODE_URI;

const discoverUsers = async (req, res) => {
  try {
    const { id, zipcode, radius, count } = req.query;
    console.log(id, zipcode, radius, count);
    const { data } = await axios.get(`${url}/${apiKey}/radius.json/${zipcode}/${radius}/mile`);
    // console.log(data);
    const matchedZipcodes = data.zip_codes.reduce((acc, el, index) => {
      // eslint-disable-next-line no-param-reassign
      acc += `'${el.zip_code}', `;
      if (index === data.zip_codes.length - 1) {
        // eslint-disable-next-line no-param-reassign
        acc = `${acc.slice(0, -2)})`;
      }
      return acc;
    }, '(');

    const distances = {};
    data.zip_codes.forEach((zip) => {
      if (distances[zip.zip_code] === undefined) {
        distances[zip.zip_code] = zip.distance;
      }
    });

    const nearbyUsers = await generateDiscoverFeed(id, matchedZipcodes, count);
    res.status(200).send({ users: nearbyUsers, distances: distances });

    // DELETE THIS AFTER FINISH TESTING
    // const result = await readFile(join(__dirname, 'users.json'), { encoding: 'utf8' });
    // res.status(200).send(JSON.parse(result));
    // eslint-disable-next-line spaced-comment
    //====================================
  } catch (err) {
    console.log(err);
    res.status(404).send('Unable to retrieve matched users');
  }
};

const userResponse = async (req, res) => {
  const { currentUserId, otherUserId, currentUserChoice, otherUserChoice } = req.body;
  // console.log(currentUserId, otherUserId, currentUserChoice, otherUserChoice);
  try {
    if (currentUserChoice !== otherUserChoice) {
      await setRelationship(currentUserId, otherUserId, currentUserChoice);
      res.status(201).send('Response updated');
    } else {
      await checkForMatchAndCreate(currentUserId, otherUserId);
      res.status(200).send({ message: 'Match found', matchedUserId: otherUserId });
    }
  } catch (err) {
    console.log(err);
    res.status(404).send('Unable to update response');
  }
};

module.exports = {
  discoverUsers: discoverUsers,
  userResponse: userResponse
};
