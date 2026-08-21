const {
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getUserPacksId,
  getSoloPosts,
  getPfp,
  makePost
} = require('../db');

// json_agg returns a single row holding NULL when nothing matched, so every
// caller has to turn that into an empty list.
const aggregated = (result) => result.rows[0]?.json_agg ?? [];

const fail = (res, status, message) => (err) => {
  console.error(message, err);
  res.status(status).send(message);
};

const ctrlPackPosts = (req, res) => {
  getPackPosts(req.query.packId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get pack posts'));
};

const ctrlUserPacksId = (req, res) => {
  getUserPacksId(req.query.userId)
    .then((resp) => res.status(200).send(aggregated(resp)))
    .catch(fail(res, 500, 'unable to get user packs'));
};

const ctrlAllPostsFromAllPacks = (req, res) => {
  getAllPostsFromAllPacks(req.query.userId)
    .then((resp) => res.status(200).send(aggregated(resp)))
    .catch(fail(res, 500, 'unable to get all pack posts'));
};

const ctrlUserPlaydatesAllPacks = (req, res) => {
  getUserPlaydatesAllPacks(req.query.userId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get all playdates'));
};

const ctrlSoloPosts = (req, res) => {
  getSoloPosts(req.query.packId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get solo posts'));
};

const ctrlPfp = (req, res) => {
  getPfp(req.query.userId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get profile photos'));
};

const ctrlMakePost = (req, res) => {
  makePost(req.body.packet || {})
    .then(() => res.status(201).send('post created'))
    .catch(fail(res, 500, 'unable to make post'));
};

module.exports = {
  ctrlPackPosts,
  ctrlAllPostsFromAllPacks,
  ctrlUserPlaydatesAllPacks,
  ctrlSoloPosts,
  ctrlPfp,
  ctrlMakePost,
  ctrlUserPacksId
};
