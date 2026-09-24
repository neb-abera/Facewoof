-- The index the paged feeds sort on.
--
-- server/db/packfeed.ts pages by keyset: `WHERE pack_id = $1 AND (date,
-- post_id) < ($2, $3) ORDER BY date DESC, post_id DESC LIMIT $4`. The only
-- index on posts was posts_pack_id_idx, on pack_id alone, which answers the
-- filter and leaves the sort to a sort node over every post the pack has. On
-- an unbounded query that was already the shape; on a paged one it is worse,
-- because the whole pack is sorted to return thirty rows.
--
-- Leading with pack_id and continuing in the sort's own direction lets the
-- planner walk the index and stop at the limit. The cursor comparison is a
-- range scan on the same index.
--
-- posts_pack_id_idx is dropped: this index has pack_id as its first column,
-- so every lookup the old one served is served here too, and carrying both
-- costs a second write on every insert for nothing.
CREATE INDEX IF NOT EXISTS posts_pack_feed_idx
  ON posts (pack_id, date DESC, post_id DESC);

DROP INDEX IF EXISTS posts_pack_id_idx;

-- The all-packs feed joins pack_users to posts and sorts the union by the
-- same pair, so it cannot lead with one pack_id. This serves that sort.
CREATE INDEX IF NOT EXISTS posts_feed_idx
  ON posts (date DESC, post_id DESC);
