-- Facewoof schema.
--
-- The original database was never committed: this file is reconstructed from
-- the queries in server/db/*.js, which are the only surviving description of
-- it. Column names and types follow what those queries read and write.
--
-- Applied once, by server/db/migrate.js. It previously opened with a DROP of
-- every table, which is correct for rebuilding a scratch database and would
-- have emptied production on each deploy.

CREATE TABLE users (
  user_id       serial PRIMARY KEY,
  dog_name      text,
  owner_name    text,
  dog_breed     text,
  age           integer,
  vaccination   boolean NOT NULL DEFAULT false,
  -- Whether this user appears in anyone else's discover feed.
  discoverable  boolean NOT NULL DEFAULT true,
  owner_email   text NOT NULL UNIQUE,
  -- A US zip code. The discover feed matches on it literally, so it is text:
  -- leading zeros are significant ('07086' is Weehawken, 7086 is nothing).
  location      text,
  likes_one     text,
  likes_two     text,
  likes_three   text,
  -- Demo visitors each get their own throwaway account rather than sharing
  -- one, so their swipes do not drain everyone else's discover feed. These
  -- two columns are what lets the server clean them up later.
  is_guest      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Demo dogs are cloned per visitor and belong only to that visitor's feed.
  -- Without this, two people running the demo in the same city see each
  -- other's copies of the same roster and the feed fills with duplicates.
  demo_of       integer REFERENCES users(user_id) ON DELETE CASCADE,
  -- Which roster profile this was copied from, so the copy's photos can be
  -- inserted in one set based statement rather than a query per dog.
  cloned_from   integer REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX users_demo_of_idx ON users(demo_of) WHERE demo_of IS NOT NULL;

CREATE INDEX users_guest_cleanup_idx ON users(created_at) WHERE is_guest;

CREATE TABLE profile_photos (
  photo_id  serial PRIMARY KEY,
  user_id   integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  url       text NOT NULL
);
CREATE INDEX profile_photos_user_id_idx ON profile_photos(user_id);

-- A swipe that has not been reciprocated yet. user1_id swiped on user2_id,
-- and user1_choice records which way.
CREATE TABLE pending_relationships (
  user1_id      integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  user2_id      integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  user1_choice  boolean NOT NULL,
  date          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user1_id, user2_id)
);

-- A mutual match. Stored once per direction by checkForMatchAndCreate.
CREATE TABLE friends (
  user1_id  integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  user2_id  integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user1_id, user2_id)
);

CREATE TABLE packs (
  pack_id  serial PRIMARY KEY,
  name     text NOT NULL
);

CREATE TABLE pack_users (
  pack_id  integer NOT NULL REFERENCES packs(pack_id) ON DELETE CASCADE,
  user_id  integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, user_id)
);

CREATE TABLE playdates (
  playdate_id  serial PRIMARY KEY,
  pack_id      integer NOT NULL REFERENCES packs(pack_id) ON DELETE CASCADE,
  user_id      integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  body         text,
  start_date   timestamptz NOT NULL,
  end_date     timestamptz NOT NULL
);
CREATE INDEX playdates_pack_id_idx ON playdates(pack_id);

CREATE TABLE posts (
  post_id    serial PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pack_id    integer NOT NULL REFERENCES packs(pack_id) ON DELETE CASCADE,
  body       text,
  date       timestamptz NOT NULL DEFAULT now(),
  photo_url  text
);
CREATE INDEX posts_pack_id_idx ON posts(pack_id);
