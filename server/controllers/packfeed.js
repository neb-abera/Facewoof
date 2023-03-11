const {
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getUserPacksId,
  getSoloPosts,
  getPfp,
  makePost
} = require('../db');

const ctrlPackPosts = (req, res) => {
  getPackPosts(req, res)
    .then((resp) => {
      res.status(201).send(resp);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to get pack posts');
    });
};

const ctrlUserPacksId = (req, res) => {
  getUserPacksId(req, res)
    .then((resp) => {
      res.status(201).send(resp);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to get user pack ID');
    });
};

const ctrlAllPostsFromAllPacks = (req, res) => {
  getAllPostsFromAllPacks(req, res)
    .then((resp) => {
      res.status(201).send(resp);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to get all pack posts');
    });
};

const ctrlUserPlaydatesAllPacks = (req, res) => {
  getUserPlaydatesAllPacks(req, res)
    .then((resp) => {
      res.status(201).send(resp.rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to get all playdates');
    });
};

const ctrlSoloPosts = (req, res) => {
  getSoloPosts(req, res)
    .then((response) => {
      // console.log('response for solodolo', response.rows);
      res.status(201).send(response.rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to get solo posts');
    });
};

const ctrlPfp = (req, res) => {
  getPfp(req, res)
    .then((resp) => {
      res.status(201).send(resp.rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to get packfeed');
    });
};

const ctrlMakePost = (req, res) => {
  makePost(req, res)
    .then((resp) => {
      res.status(201).send(resp);
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('unable to make post');
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
