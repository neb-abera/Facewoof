-- Facewoof seed data.
--
-- Rebuilt from server/controllers/users.json, the fixture the original
-- team left behind, plus generated packs, posts and playdates so the
-- demo account has something to look at. Regenerating is deterministic.

BEGIN;

-- The template the demo accounts are cloned from. A normal profile:
-- guests get their own row, and inherit this one's photos, packs and matches.
INSERT INTO users (user_id, dog_name, owner_name, dog_breed, age, vaccination, discoverable, owner_email, location, likes_one, likes_two, likes_three) VALUES
  (1, 'Biscuit', 'Sam Rivera', 'Golden Retriever', 4, true, true, 'biscuit@facewoof.app', '10011', 'fetch', 'dog parks', 'belly rubs');

-- The 31 profiles from the original fixture.
INSERT INTO users (user_id, dog_name, owner_name, dog_breed, age, vaccination, discoverable, owner_email, location, likes_one, likes_two, likes_three) VALUES
  (3, 'Brien', 'Hinda Rojel', 'Basset Hound', 7, false, true, 'pmousdall2@examiner.com', '10021', 'chasing squirrels', 'frisbee', 'beach days'),
  (2, 'Jermain', 'Tammy Seth', 'Husky', 11, true, true, 'dbaggot1@com.com', '10036', 'naps', 'hiking', 'snow'),
  (58, 'Herold', 'Corri Collinette', 'Golden Retriever', 4, false, true, 'rstolberg1l@goo.gl', '10017', 'belly rubs', 'squeaky toys', 'tennis balls'),
  (74, 'Rodie', 'Shauna Marzelo', 'Doberman', 12, false, true, 'tveivers21@tripod.com', '07086', 'chasing squirrels', 'beach days', 'tug of war'),
  (29, 'Antoni', 'Fina Headings', 'Jack Russell Terrier', 6, true, true, 'sniblocks@ebay.co.uk', '10029', 'hiking', 'chasing squirrels', 'swimming'),
  (68, 'Nanni', 'Roberta Bagshaw', 'Mutt', 3, false, true, 'kberka1v@ameblo.jp', '11240', 'chasing squirrels', 'long walks', 'squeaky toys'),
  (34, 'Noelani', 'Jody Stockell', 'Australian Shepherd', 7, true, true, 'ckrautx@mlb.com', '10021', 'hiking', 'beach days', 'long walks'),
  (51, 'Brendis', 'Clive Ourtic', 'Whippet', 5, true, true, 'djarmaine1e@ask.com', '10017', 'chasing squirrels', 'beach days', 'squeaky toys'),
  (52, 'Bartlett', 'Nate O''Grada', 'Boxer', 1, false, true, 'bkelf1f@eepurl.com', '10036', 'hiking', 'tennis balls', 'chasing squirrels'),
  (63, 'Lowell', 'Celie Andriveaux', 'Newfoundland', 13, true, true, 'tphilcox1q@xrea.com', '11240', 'frisbee', 'belly rubs', 'fetch'),
  (39, 'Alanna', 'Rivy Sleightholme', 'Chihuahua', 12, false, true, 'dgreasty12@phpbb.com', '10017', 'chasing squirrels', 'frisbee', 'long walks'),
  (36, 'Euphemia', 'Weidar Shuter', 'Jack Russell Terrier', 14, false, true, 'scablez@businessinsider.com', '10011', 'beach days', 'swimming', 'dog parks'),
  (31, 'Martica', 'Cookie Le Pruvost', 'Great Dane', 2, false, true, 'mchristescuu@ovh.net', '10019', 'belly rubs', 'tennis balls', 'chasing squirrels'),
  (14, 'Lemuel', 'Judah Sydall', 'Pug', 4, true, true, 'fsprakesd@telegraph.co.uk', '10036', 'beach days', 'frisbee', 'tug of war'),
  (22, 'Siusan', 'Jacintha Giraths', 'Australian Shepherd', 2, true, true, 'gtraversl@prnewswire.com', '10021', 'squeaky toys', 'agility', 'long walks'),
  (75, 'Deck', 'Dacia Couche', 'Border Collie', 8, true, true, 'emactavish22@abc.net.au', '07087', 'long walks', 'tennis balls', 'squeaky toys'),
  (42, 'Frederic', 'Damita Rabjohn', 'Mutt', 10, true, true, 'cmatejka15@nsw.gov.au', '10029', 'long walks', 'belly rubs', 'fetch'),
  (46, 'Vasily', 'Aubrey Driver', 'Husky', 1, false, true, 'isnare19@smugmug.com', '10036', 'squeaky toys', 'swimming', 'long walks'),
  (53, 'Dyan', 'Ara Londer', 'Shiba Inu', 3, true, true, 'vsenchenko1g@blog.com', '10021', 'frisbee', 'swimming', 'car rides'),
  (38, 'Holly', 'Chandler LLelweln', 'Rottweiler', 1, true, true, 'dkingsmill11@ask.com', '10011', 'belly rubs', 'fetch', 'hiking'),
  (26, 'Christabel', 'Vernen Skeete', 'Doberman', 10, true, true, 'gpaginp@phoca.cz', '10017', 'belly rubs', 'squeaky toys', 'frisbee'),
  (12, 'Sioux', 'Karl Bonny', 'Pug', 10, false, true, 'jginnalyb@cdbaby.com', '10019', 'car rides', 'agility', 'fetch'),
  (24, 'Elspeth', 'Chevalier Vsanelli', 'Golden Retriever', 6, false, true, 'lstartenn@storify.com', '10011', 'frisbee', 'snow', 'swimming'),
  (19, 'Iver', 'Paxton Grinvalds', 'German Shepherd', 8, false, true, 'adanseri@acquirethisname.com', '10011', 'naps', 'agility', 'beach days'),
  (21, 'Melody', 'Katti Prydie', 'Great Dane', 15, false, true, 'chellensk@google.com.hk', '10036', 'naps', 'hiking', 'belly rubs'),
  (49, 'Jillane', 'Jacquenette Blinder', 'Pug', 14, true, true, 'dgantz1c@ebay.com', '10011', 'long walks', 'chasing squirrels', 'car rides'),
  (17, 'Bella', 'Arabella MacGahey', 'Golden Retriever', 4, true, true, 'mcapong@disqus.com', '10011', 'beach days', 'tennis balls', 'fetch'),
  (37, 'Laurianne', 'Kane Grouen', 'Chihuahua', 8, false, true, 'sdobbs10@sogou.com', '10019', 'tennis balls', 'agility', 'hiking'),
  (27, 'Murvyn', 'Teodora Shearstone', 'Poodle', 13, true, true, 'sreapq@blogtalkradio.com', '10036', 'chasing squirrels', 'tennis balls', 'agility'),
  (33, 'Parry', 'Rora Madre', 'Husky', 5, false, true, 'fcrockettw@opensource.org', '10036', 'agility', 'tug of war', 'long walks'),
  (56, 'Tierney', 'Barbara Simons', 'Jack Russell Terrier', 11, false, true, 'efetherby1j@forbes.com', '10019', 'tug of war', 'fetch', 'dog parks');

-- Profile photos.
INSERT INTO profile_photos (user_id, url) VALUES
  (1, 'https://placedog.net/500/400?id=7'),
  (3, 'https://placedog.net/500/400?id=10'),
  (3, 'https://placedog.net/500/400?id=11'),
  (3, 'https://placedog.net/500/400?id=12'),
  (2, 'https://placedog.net/500/400?id=7'),
  (2, 'https://placedog.net/500/400?id=8'),
  (2, 'https://placedog.net/500/400?id=9'),
  (58, 'https://placedog.net/500/400?id=175'),
  (58, 'https://placedog.net/500/400?id=176'),
  (58, 'https://placedog.net/500/400?id=177'),
  (74, 'https://placedog.net/500/400?id=223'),
  (74, 'https://placedog.net/500/400?id=224'),
  (74, 'https://placedog.net/500/400?id=225'),
  (29, 'https://placedog.net/500/400?id=88'),
  (29, 'https://placedog.net/500/400?id=89'),
  (29, 'https://placedog.net/500/400?id=90'),
  (68, 'https://placedog.net/500/400?id=205'),
  (68, 'https://placedog.net/500/400?id=206'),
  (68, 'https://placedog.net/500/400?id=207'),
  (34, 'https://placedog.net/500/400?id=103'),
  (34, 'https://placedog.net/500/400?id=104'),
  (34, 'https://placedog.net/500/400?id=105'),
  (51, 'https://placedog.net/500/400?id=154'),
  (51, 'https://placedog.net/500/400?id=155'),
  (51, 'https://placedog.net/500/400?id=156'),
  (52, 'https://placedog.net/500/400?id=157'),
  (52, 'https://placedog.net/500/400?id=158'),
  (52, 'https://placedog.net/500/400?id=159'),
  (63, 'https://placedog.net/500/400?id=190'),
  (63, 'https://placedog.net/500/400?id=191'),
  (63, 'https://placedog.net/500/400?id=192'),
  (39, 'https://placedog.net/500/400?id=118'),
  (39, 'https://placedog.net/500/400?id=119'),
  (39, 'https://placedog.net/500/400?id=120'),
  (36, 'https://placedog.net/500/400?id=109'),
  (36, 'https://placedog.net/500/400?id=110'),
  (36, 'https://placedog.net/500/400?id=111'),
  (31, 'https://placedog.net/500/400?id=94'),
  (31, 'https://placedog.net/500/400?id=95'),
  (31, 'https://placedog.net/500/400?id=96'),
  (14, 'https://placedog.net/500/400?id=43'),
  (14, 'https://placedog.net/500/400?id=44'),
  (14, 'https://placedog.net/500/400?id=45'),
  (22, 'https://placedog.net/500/400?id=67'),
  (22, 'https://placedog.net/500/400?id=68'),
  (22, 'https://placedog.net/500/400?id=69'),
  (75, 'https://placedog.net/500/400?id=226'),
  (75, 'https://placedog.net/500/400?id=227'),
  (75, 'https://placedog.net/500/400?id=228'),
  (42, 'https://placedog.net/500/400?id=127'),
  (42, 'https://placedog.net/500/400?id=128'),
  (42, 'https://placedog.net/500/400?id=129'),
  (46, 'https://placedog.net/500/400?id=139'),
  (46, 'https://placedog.net/500/400?id=140'),
  (46, 'https://placedog.net/500/400?id=141'),
  (53, 'https://placedog.net/500/400?id=160'),
  (53, 'https://placedog.net/500/400?id=161'),
  (53, 'https://placedog.net/500/400?id=162'),
  (38, 'https://placedog.net/500/400?id=115'),
  (38, 'https://placedog.net/500/400?id=116'),
  (38, 'https://placedog.net/500/400?id=117'),
  (26, 'https://placedog.net/500/400?id=79'),
  (26, 'https://placedog.net/500/400?id=80'),
  (26, 'https://placedog.net/500/400?id=81'),
  (12, 'https://placedog.net/500/400?id=37'),
  (12, 'https://placedog.net/500/400?id=38'),
  (12, 'https://placedog.net/500/400?id=39'),
  (24, 'https://placedog.net/500/400?id=73'),
  (24, 'https://placedog.net/500/400?id=74'),
  (24, 'https://placedog.net/500/400?id=75'),
  (19, 'https://placedog.net/500/400?id=58'),
  (19, 'https://placedog.net/500/400?id=59'),
  (19, 'https://placedog.net/500/400?id=60'),
  (21, 'https://placedog.net/500/400?id=64'),
  (21, 'https://placedog.net/500/400?id=65'),
  (21, 'https://placedog.net/500/400?id=66'),
  (49, 'https://placedog.net/500/400?id=148'),
  (49, 'https://placedog.net/500/400?id=149'),
  (49, 'https://placedog.net/500/400?id=150'),
  (17, 'https://placedog.net/500/400?id=52'),
  (17, 'https://placedog.net/500/400?id=53'),
  (17, 'https://placedog.net/500/400?id=54'),
  (37, 'https://placedog.net/500/400?id=112'),
  (37, 'https://placedog.net/500/400?id=113'),
  (37, 'https://placedog.net/500/400?id=114'),
  (27, 'https://placedog.net/500/400?id=82'),
  (27, 'https://placedog.net/500/400?id=83'),
  (27, 'https://placedog.net/500/400?id=84'),
  (33, 'https://placedog.net/500/400?id=100'),
  (33, 'https://placedog.net/500/400?id=101'),
  (33, 'https://placedog.net/500/400?id=102'),
  (56, 'https://placedog.net/500/400?id=169'),
  (56, 'https://placedog.net/500/400?id=170'),
  (56, 'https://placedog.net/500/400?id=171');

-- Profiles who already swiped yes on the guest: the discover feed
-- sorts these to the front.
INSERT INTO pending_relationships (user1_id, user2_id, user1_choice) VALUES
  (17, 1, true),
  (22, 1, true),
  (34, 1, true),
  (39, 1, true),
  (46, 1, true),
  (58, 1, true);

-- Existing matches for the guest, stored once per direction.
INSERT INTO friends (user1_id, user2_id) VALUES
  (1, 2),
  (2, 1),
  (1, 24),
  (24, 1),
  (1, 36),
  (36, 1),
  (1, 53),
  (53, 1),
  (1, 68),
  (68, 1);

-- Packs the guest belongs to.
INSERT INTO packs (pack_id, name) VALUES
  (1, 'Chelsea Morning Crew'),
  (2, 'Hudson River Runners'),
  (3, 'Puppy Playgroup');

INSERT INTO pack_users (pack_id, user_id) VALUES
  (1, 1),
  (2, 1),
  (3, 1),
  (1, 2),
  (2, 2),
  (2, 24),
  (3, 24),
  (3, 36),
  (1, 36),
  (1, 53),
  (2, 53),
  (2, 68),
  (3, 68);

-- Pack feed posts.
INSERT INTO posts (user_id, pack_id, body, date, photo_url) VALUES
  (24, 1, 'Elspeth found the muddiest puddle in the park. Worth it.', now() - interval '1 hours', 'https://placedog.net/500/400?id=1'),
  (53, 1, 'Anyone free for a walk along the water this weekend?', now() - interval '8 hours', NULL),
  (1, 1, 'Biscuit finally learned to sit. Only took eight months.', now() - interval '15 hours', NULL),
  (2, 1, 'New squeaky toy lasted eleven minutes. New record low.', now() - interval '22 hours', 'https://placedog.net/500/400?id=52'),
  (24, 2, 'Elspeth made a friend at the dog run today!', now() - interval '29 hours', NULL),
  (2, 2, 'Reminder: the 23rd St gate is closed for repairs until Friday.', now() - interval '36 hours', NULL),
  (1, 2, 'Rainy day. Biscuit is refusing to go outside on principle.', now() - interval '43 hours', 'https://placedog.net/500/400?id=103'),
  (68, 2, 'Vet says Nanni is in great shape. Treats all around.', now() - interval '50 hours', NULL),
  (36, 3, 'Euphemia found the muddiest puddle in the park. Worth it.', now() - interval '57 hours', NULL),
  (24, 3, 'Anyone free for a walk along the water this weekend?', now() - interval '64 hours', 'https://placedog.net/500/400?id=154'),
  (68, 3, 'Nanni finally learned to sit. Only took eight months.', now() - interval '71 hours', NULL),
  (1, 3, 'New squeaky toy lasted eleven minutes. New record low.', now() - interval '78 hours', NULL);

-- Scheduled playdates, relative to whenever the seed is loaded.
INSERT INTO playdates (pack_id, user_id, body, start_date, end_date) VALUES
  (1, 1, 'Morning walk, meet at the 23rd St entrance', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '2 days 9 hours') AT TIME ZONE 'America/New_York', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '2 days 10 hours') AT TIME ZONE 'America/New_York'),
  (2, 1, 'Riverside run', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '5 days 18 hours') AT TIME ZONE 'America/New_York', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '5 days 19 hours') AT TIME ZONE 'America/New_York'),
  (3, 2, 'Puppy social hour', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '9 days 14 hours') AT TIME ZONE 'America/New_York', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '9 days 16 hours') AT TIME ZONE 'America/New_York'),
  (1, 24, 'Weekend park meetup', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '12 days 11 hours') AT TIME ZONE 'America/New_York', (date_trunc('day', now() AT TIME ZONE 'America/New_York') + interval '12 days 13 hours') AT TIME ZONE 'America/New_York');

-- The inserts above set explicit ids, which leaves the sequences behind.
SELECT setval('users_user_id_seq', (SELECT max(user_id) FROM users));
SELECT setval('packs_pack_id_seq', (SELECT max(pack_id) FROM packs));

COMMIT;
