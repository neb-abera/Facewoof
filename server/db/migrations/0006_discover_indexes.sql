-- Indexes for the discover feed.
--
-- The feed (server/db/discover.ts) asks three questions on every page, and
-- none of them had an index to answer with:
--
--   users in these zip codes        users.location = ANY($zips)
--   who has swiped on me            pending_relationships.user2_id = $me
--   who I am already friends with   friends.user2_id = $me
--
-- The two relationship tables are keyed (user1_id, user2_id), which serves a
-- lookup by user1_id and nothing else: the reverse direction was a sequential
-- scan of every swipe and every friendship, per request. users had no index
-- on location at all, so every page read the whole table - and every demo
-- visitor adds a hundred rows to it.
--
-- Plain CREATE INDEX, not CONCURRENTLY: the runner applies each migration in
-- a transaction, where CONCURRENTLY is refused, and these tables are small
-- enough that the brief write lock at deploy is not worth a special case.
CREATE INDEX users_location_idx ON users (location);
CREATE INDEX pending_relationships_user2_id_idx ON pending_relationships (user2_id);
CREATE INDEX friends_user2_id_idx ON friends (user2_id);
