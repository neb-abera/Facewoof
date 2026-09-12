/*
 * The API's shapes, by name.
 *
 * src/api-types.d.ts is generated from server/openapi.json and is the only
 * source of truth for what the server sends and accepts; these aliases are
 * the short names the components use. A schema change on the server
 * regenerates that file and shows up here as a compile error, which is the
 * point of the whole arrangement.
 */
import type { components, paths } from "./api-types";

type Schemas = components["schemas"];

export type User = Schemas["User"];
export type Friend = Schemas["Friend"];
export type FeedCard = Schemas["FeedCard"];
export type Pack = Schemas["Pack"];
export type Post = Schemas["Post"];
export type PackPost = Schemas["PackPost"];
export type Playdate = Schemas["Playdate"];
export type PackPlaydate = Schemas["PackPlaydate"];
export type DiscoverPage = Schemas["DiscoverPage"];
export type Providers = Schemas["Providers"];

type Body<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;

/* Where the visitor is: a zip code, or device coordinates. */
export type Whereabouts = Body<"/api/auth/guest", "post">;
export type OnboardingBody = Body<"/api/onboarding", "put">;
export type EditProfileBody = Body<"/api/edituser", "put">;

/* A playdate as react-big-calendar draws it. */
export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
}
