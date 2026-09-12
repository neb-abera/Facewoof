/*
 * Every route, re-exported from one place so routes.ts assembles the table
 * and nothing else needs to know how the handlers are filed.
 */
export { guestLogin, logout, me } from "./auth.ts";
export {
  AddPlaydate,
  ctrlUserPlaydatesAllPacks,
  getPlaydates,
} from "./calendar.ts";
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
  ctrlSoloPosts,
} from "./packfeed.ts";
export {
  addUserToPack,
  createNewPackAndAdd,
  ctrlUserPacksId,
  getUserPacks,
} from "./packs.ts";
export {
  createPack,
  createPhotos,
  ctrlPfp,
  editProfile,
  getCurrentUser,
  getProfilePhoto,
  getUserFriends,
  updateLocation,
} from "./profile.ts";
