const {
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getUserPacksId,
  getSoloPosts,
  getPfp,
  makePost
} = require('../db/');

var ctrlPackPosts = (req, res) => {
  getPackPosts(req, res).then((resp) => {
    res.status(201).send(resp);
  });
};

var ctrlUserPacksId = (req, res) => {
  getUserPacksId(req, res).then((resp) => {
    res.status(201).send(resp);
  });
};

var ctrlAllPostsFromAllPacks = (req, res) => {
  getAllPostsFromAllPacks(req, res).then((resp) => {
    res.status(201).send(resp);
  });
};

var ctrlUserPlaydatesAllPacks = (req, res) => {
  getUserPlaydatesAllPacks(req, res).then((resp) => {
    res.status(201).send(resp.rows);
  });
};

var ctrlSoloPosts = (req, res) => {
  getSoloPosts(req, res).then((response) => {
    // console.log('response for solodolo', response.rows);
    res.status(201).send(response.rows);
  });
};

var ctrlPfp = (req, res) => {
  getPfp(req, res).then((resp) => {
    res.status(201).send(resp.rows);
  });
};

var ctrlMakePost = (req, res) => {
  makePost(req, res).then((resp) => {
    res.status(201).send(resp);
  });
};

module.exports = {
  // getUserPacksId: getUserPacksId,
  ctrlPackPosts: ctrlPackPosts,
  ctrlAllPostsFromAllPacks: ctrlAllPostsFromAllPacks,
  ctrlUserPlaydatesAllPacks: ctrlUserPlaydatesAllPacks,
  ctrlSoloPosts: ctrlSoloPosts,
  ctrlPfp: ctrlPfp,
  ctrlMakePost: ctrlMakePost,
  ctrlUserPacksId: ctrlUserPacksId
};
