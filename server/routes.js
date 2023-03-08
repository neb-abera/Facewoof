const express = require('express');
const { discoverUsers, userResponse, getPlaydates } = require('./controllers');

const router = express.Router();

// Route handling discover nearby users
router.get('/api/discover', discoverUsers);

// Route handling response (dig/deny) from current user
router.post('/api/response', userResponse);

// Route handling getting all playdates for packs current user is a member of
router.get('/playdates', getPlaydates);

module.exports = router;
