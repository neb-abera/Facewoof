const express = require('express');
const { discoverUsers, userResponse } = require('./controllers');

const router = express.Router();

// Route handling discover nearby users
router.get('/api/discover', discoverUsers);

// Route handling response (dig/deny) from current user
router.post('/api/response', userResponse);

module.exports = router;
