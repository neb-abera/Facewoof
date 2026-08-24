const {
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getUserPacksId,
  getSoloPosts,
  getPfp,
  makePost,
  isPackMember
} = require('../db');

// json_agg returns a single row holding NULL when nothing matched, so every
// caller has to turn that into an empty list.
const aggregated = (result) => result.rows[0]?.json_agg ?? [];

const fail = (res, status, message) => (err) => {
  console.error(message, err);
  res.status(status).send(message);
};

const ctrlPackPosts = (req, res) => {
  const packId = Number(req.query.packId);
  if (!Number.isInteger(packId)) return res.status(400).send('packId is required');

  // A pack's feed is for its members. Without this, any signed-in visitor —
  // including a throwaway demo account — could read any pack's posts by
  // walking pack ids.
  return isPackMember(req.userId, packId)
    .then((member) => {
      if (!member) return res.status(403).send('not a member of this pack');
      return getPackPosts(packId).then((resp) => res.status(200).send(resp.rows));
    })
    .catch(fail(res, 500, 'unable to get pack posts'));
};

const ctrlUserPacksId = (req, res) => {
  getUserPacksId(req.userId)
    .then((resp) => res.status(200).send(aggregated(resp)))
    .catch(fail(res, 500, 'unable to get user packs'));
};

const ctrlAllPostsFromAllPacks = (req, res) => {
  getAllPostsFromAllPacks(req.userId)
    .then((resp) => res.status(200).send(aggregated(resp)))
    .catch(fail(res, 500, 'unable to get all pack posts'));
};

const ctrlUserPlaydatesAllPacks = (req, res) => {
  getUserPlaydatesAllPacks(req.userId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get all playdates'));
};

const ctrlSoloPosts = (req, res) => {
  getSoloPosts(req.query.packId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get solo posts'));
};

const ctrlPfp = (req, res) => {
  getPfp(req.userId)
    .then((resp) => res.status(200).send(resp.rows))
    .catch(fail(res, 500, 'unable to get profile photos'));
};

const ctrlMakePost = (req, res) => {
  const packet = req.body.packet || {};
  const packId = Number(packet.pack_id);
  if (!Number.isInteger(packId)) return res.status(400).send('pack_id is required');

  // Posting requires membership, for the same reason reading does.
  return isPackMember(req.userId, packId)
    .then((member) => {
      if (!member) return res.status(403).send('not a member of this pack');
      // The author is the session, not whatever user_id the packet claimed.
      return makePost({ ...packet, pack_id: packId, user_id: req.userId }).then(() =>
        res.status(201).send('post created')
      );
    })
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
