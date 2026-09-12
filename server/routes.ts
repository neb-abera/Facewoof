/*
 * The route table: every HTTP endpoint, in the order the document lists them.
 *
 * Each entry is a defineRoute() from server/controllers, carrying its method,
 * path, auth requirement, rate limiter, request schemas, response schemas and
 * handler. server/api/express.ts mounts the table; server/api/openapi.ts
 * documents it. Adding an endpoint is adding a line here.
 *
 * Everything lives under /api. Five routes used to sit at the root
 * (/getFriends, /getCurrentUser, /getProfilePhoto, /editUser, /createPack),
 * which meant the dev server needed a proxy rule per route and the production
 * server could not tell an API path from a client route it should hand the
 * single page app.
 */
import { buildRouter } from "./api/express.ts";
import type { AnyRoute } from "./api/route.ts";
import * as c from "./controllers/index.ts";

export const routes: readonly AnyRoute[] = [
  // --- auth ---
  c.guestLogin,
  c.me,
  c.logout,
  // Sign-in through Entra External ID. These are browser navigations rather
  // than fetches, so they redirect.
  c.oidcProviders,
  c.oidcStart,
  c.oidcCallback,
  // Finishing setup after signing in: profile, location and a roster to see.
  c.finishOnboarding,

  // --- discover ---
  c.discoverUsers,
  c.resolveLocation,
  c.userResponse,

  // --- profile ---
  c.getCurrentUser,
  c.updateLocation,
  c.getUserFriends,
  c.editProfile,
  c.getProfilePhoto,
  c.createPhotos,
  c.ctrlPfp,

  // --- packs ---
  c.getUserPacks,
  c.ctrlUserPacksId,
  c.addUserToPack,
  c.createNewPackAndAdd,
  c.createPack,

  // --- pack feed ---
  c.ctrlPackPosts,
  c.ctrlAllPostsFromAllPacks,
  c.ctrlSoloPosts,
  c.ctrlMakePost,

  // --- calendar ---
  c.getPlaydates,
  c.AddPlaydate,
  c.ctrlUserPlaydatesAllPacks,
];

export const router = buildRouter(routes);
