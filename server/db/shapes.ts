/*
 * Row shapes the queries build out of the tables: joins, aggregates and
 * projections. Written in terms of the generated table interfaces in
 * rows.ts (Pick, intersection) so that a column renamed by a migration
 * breaks these too, rather than only the table it lives in.
 */
import type { PackRow, PostRow, UserRow } from "./rows.ts";

/* A profile with its photos gathered up, as the friends list returns it. */
export type ProfileWithPhotos = UserRow & { photos: string[] | null };

/* One card in the discover feed. */
export type FeedRow = Pick<
  UserRow,
  | "user_id"
  | "dog_name"
  | "owner_name"
  | "dog_breed"
  | "age"
  | "vaccination"
  | "discoverable"
  | "owner_email"
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
