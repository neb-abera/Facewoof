/*
 * Every request handler, re-exported from one place so routes.ts imports the
 * lot and nothing else needs to know how the handlers are filed.
 */
export { guestLogin, logout, me } from "./auth.ts";
export { AddPlaydate, getPlaydates } from "./calendar.ts";
export { discoverUsers, resolveLocation, userResponse } from "./discover.ts";
export {
  callback as oidcCallback,
  providers as oidcProviders,
  start as oidcStart,
} from "./oidc.ts";
export { finish as finishOnboarding } from "./onboarding.ts";
export {
  ctrlAllPostsFromAllPacks,
  ctrlMakePost,
  ctrlPackPosts,
  ctrlPfp,
  ctrlSoloPosts,
  ctrlUserPacksId,
  ctrlUserPlaydatesAllPacks,
} from "./packfeed.ts";
export { addUserToPack, createNewPackAndAdd, getUserPacks } from "./packs.ts";
export {
  createPack,
  createPhotos,
  editProfile,
  getCurrentUser,
  getProfilePhoto,
  getUserFriends,
  updateLocation,
} from "./profile.ts";
