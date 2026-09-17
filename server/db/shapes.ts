/*
 * Row shapes the queries build out of the tables: joins, aggregates and
 * projections. Written in terms of the generated table interfaces in
 * rows.ts (Pick, intersection) so that a column renamed by a migration
 * breaks these too, rather than only the table it lives in.
 */
import type { PackRow, PostRow, UserRow } from "./rows.ts";

/*
 * A friend's profile with its photos gathered up. A closed list of columns:
 * never owner_email or location, which belong to the account's owner alone.
 */
export type ProfileWithPhotos = Pick<
  UserRow,
  | "user_id"
  | "dog_name"
  | "owner_name"
  | "dog_breed"
  | "age"
  | "vaccination"
  | "likes_one"
  | "likes_two"
  | "likes_three"
  | "size"
  | "energy"
  | "best_time"
  | "bio"
> & { photos: string[] | null };

/*
 * One row of the discover feed. `location` is for the controller to turn
 * into a distance; it does not leave the server.
 */
export type FeedRow = Pick<
  UserRow,
  | "user_id"
  | "dog_name"
  | "owner_name"
  | "dog_breed"
  | "age"
  | "vaccination"
  | "location"
> & {
  /* Whether this dog has already swiped yes on the caller. */
  user1_choice: boolean | null;
  photos: string[] | null;
  interests: (string | null)[];
};

/* A pack's post with the pack's name and the author's name joined in. */
export type PackPostRow = PostRow &
  Pick<PackRow, "name"> &
  Pick<UserRow, "owner_name">;

/*
 * A playdate as getAllPlaydates aggregates it. Built with json_agg, so it
 * has already been through Postgres's JSON serialisation: the timestamps
 * are strings here, not Dates.
 */
export interface PackPlaydate {
  pack_id: number;
  pack_name: string;
  playdate_start_date: string;
  playdate_end_date: string;
  playdate_body: string | null;
}
