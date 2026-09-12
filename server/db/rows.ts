/*
 * The tables, as pg hands their rows back.
 *
 * One interface per table in server/db/migrations, column for column. pg
 * returns timestamptz columns as Date objects; a json_agg'd timestamp, by
 * contrast, is a string by the time it leaves Postgres, which is why the
 * aggregate shapes further down declare their dates as strings.
 *
 * Written by hand for now. The plan is to generate this file from the live
 * schema so that a migration which renames a column breaks the build rather
 * than a page; until then, a change to a migration is a change here too.
 */

export interface UserRow {
  user_id: number;
  dog_name: string | null;
  owner_name: string | null;
  dog_breed: string | null;
  age: number | null;
  vaccination: boolean;
  discoverable: boolean;
  owner_email: string;
  location: string | null;
  likes_one: string | null;
  likes_two: string | null;
  likes_three: string | null;
  is_guest: boolean;
  created_at: Date;
  demo_of: number | null;
  cloned_from: number | null;
  onboarded_at: Date | null;
  size: string | null;
  energy: string | null;
  best_time: string | null;
  bio: string | null;
}

export interface ProfilePhotoRow {
  photo_id: number;
  user_id: number;
  url: string;
}

export interface PackRow {
  pack_id: number;
  name: string;
}

export interface PostRow {
  post_id: number;
  user_id: number;
  pack_id: number;
  body: string | null;
  date: Date;
  photo_url: string | null;
}

export interface PlaydateRow {
  playdate_id: number;
  pack_id: number;
  user_id: number;
  body: string | null;
  start_date: Date;
  end_date: Date;
}

/* A profile with its photos gathered up, as the discover feed and the friends
 * list return it. */
export interface ProfileWithPhotos extends UserRow {
  photos: string[] | null;
}

/* One card in the discover feed. */
export interface FeedRow {
  user_id: number;
  dog_name: string | null;
  owner_name: string | null;
  dog_breed: string | null;
  age: number | null;
  vaccination: boolean;
  discoverable: boolean;
  owner_email: string;
  location: string | null;
  /* Whether this dog has already swiped yes on the caller. */
  user1_choice: boolean | null;
  photos: string[] | null;
  interests: (string | null)[];
}

/* A pack's post with the pack's name and the author's name joined in. */
export interface PackPostRow extends PostRow {
  name: string;
  owner_name: string | null;
}

/* A playdate as getAllPlaydates aggregates it: dates are JSON strings. */
export interface PackPlaydate {
  pack_id: number;
  pack_name: string;
  playdate_start_date: string;
  playdate_end_date: string;
  playdate_body: string | null;
}
