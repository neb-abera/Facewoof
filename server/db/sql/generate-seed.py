import json, random

users = json.load(open('server/controllers/users.json'))
random.seed(1337)  # deterministic: regenerating must not churn the file

# The fixture's dog_breed column came from a generic animal-name list, so the
# profiles advertise breeds like 'Killer whale' and 'Osprey'. Mapped onto real
# breeds, deterministically by original value, so the demo reads as a dog app.
BREEDS = ['Labrador Retriever','German Shepherd','Golden Retriever','Beagle',
          'Poodle','Border Collie','Corgi','Dachshund','Boxer','Husky',
          'Australian Shepherd','Shiba Inu','Great Dane','Pug','Rottweiler',
          'Bernese Mountain Dog','Cocker Spaniel','Jack Russell Terrier',
          'Doberman','Whippet','Basset Hound','Newfoundland','Vizsla',
          'Samoyed','Chihuahua','Mutt']

INTERESTS = ['fetch','long walks','dog parks','swimming','tug of war','naps',
             'squeaky toys','car rides','agility','frisbee','belly rubs',
             'chasing squirrels','hiking','snow','beach days','tennis balls']

def breed_for(original):
    # Stable hash so the same fixture row always gets the same breed.
    return BREEDS[sum(ord(c) for c in original) % len(BREEDS)]

def q(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, int): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

out = ["-- Facewoof seed data.",
       "--",
       "-- Rebuilt from server/controllers/users.json, the fixture the original",
       "-- team left behind, plus generated packs, posts and playdates so the",
       "-- demo account has something to look at. Regenerating is deterministic.",
       "",
       "BEGIN;", ""]

# The guest account every demo visitor lands in. Fixed id so the server can
# find it without a lookup by email on every request.
GUEST = 1
out.append("-- The template the demo accounts are cloned from. A normal profile:")
out.append("-- guests get their own row, and inherit this one's photos, packs and matches.")
out.append(
    "INSERT INTO users (user_id, dog_name, owner_name, dog_breed, age, vaccination, "
    "discoverable, owner_email, location, likes_one, likes_two, likes_three) VALUES\n"
    "  (1, 'Biscuit', 'Sam Rivera', 'Golden Retriever', 4, true, true, "
    "'biscuit@facewoof.app', '10011', 'fetch', 'dog parks', 'belly rubs');")
out.append("")

rows = []
for u in users:
    likes = random.sample(INTERESTS, 3)
    rows.append("  ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})".format(
        q(int(u['user_id'])), q(u['dog_name']), q(u['owner_name']), q(breed_for(u['dog_breed'])),
        q(u['age']), q(u['vaccination']), q(u['discoverable']), q(u['owner_email']),
        q(u['location']), q(likes[0]), q(likes[1]), q(likes[2])))
out.append("-- The 31 profiles from the original fixture.")
out.append(
    "INSERT INTO users (user_id, dog_name, owner_name, dog_breed, age, vaccination, "
    "discoverable, owner_email, location, likes_one, likes_two, likes_three) VALUES\n"
    + ",\n".join(rows) + ";")
out.append("")

# The fixture's photos were grey dummyimage placeholders. placedog.net serves
# real dog photos at a stable id, which makes the discover feed worth showing.
photos = ["  (1, 'https://placedog.net/500/400?id=7')"]
for u in users:
    uid = int(u['user_id'])
    for n in range(len(u.get('photos') or [])):
        photos.append("  ({}, 'https://placedog.net/500/400?id={}')".format(
            uid, (uid * 3 + n) % 250 + 1))
out.append("-- Profile photos.")
out.append("INSERT INTO profile_photos (user_id, url) VALUES\n" + ",\n".join(photos) + ";")
out.append("")

ids = [int(u['user_id']) for u in users]

# Profiles that already swiped yes on the guest. The discover feed sorts these
# to the front, so the demo shows off that ordering immediately.
admirers = sorted(random.sample(ids, 6))
out.append("-- Profiles who already swiped yes on the guest: the discover feed")
out.append("-- sorts these to the front.")
out.append("INSERT INTO pending_relationships (user1_id, user2_id, user1_choice) VALUES\n"
           + ",\n".join("  ({}, {}, true)".format(a, GUEST) for a in admirers) + ";")
out.append("")

friends = sorted(random.sample([i for i in ids if i not in admirers], 5))
pairs = []
for f in friends:
    pairs.append("  ({}, {})".format(GUEST, f))
    pairs.append("  ({}, {})".format(f, GUEST))
out.append("-- Existing matches for the guest, stored once per direction.")
out.append("INSERT INTO friends (user1_id, user2_id) VALUES\n" + ",\n".join(pairs) + ";")
out.append("")

PACKS = [(1, 'Chelsea Morning Crew'), (2, 'Hudson River Runners'), (3, 'Puppy Playgroup')]
out.append("-- Packs the guest belongs to.")
out.append("INSERT INTO packs (pack_id, name) VALUES\n"
           + ",\n".join("  ({}, {})".format(p, q(n)) for p, n in PACKS) + ";")
out.append("")

members = ["  ({}, {})".format(p, GUEST) for p, _ in PACKS]
for i, f in enumerate(friends):
    members.append("  ({}, {})".format(PACKS[i % len(PACKS)][0], f))
    members.append("  ({}, {})".format(PACKS[(i + 1) % len(PACKS)][0], f))
seen, uniq = set(), []
for m in members:
    if m not in seen:
        seen.add(m); uniq.append(m)
out.append("INSERT INTO pack_users (pack_id, user_id) VALUES\n" + ",\n".join(uniq) + ";")
out.append("")

by_name = {int(u['user_id']): u['dog_name'] for u in users}
BODIES = [
    "{} found the muddiest puddle in the park. Worth it.",
    "Anyone free for a walk along the water this weekend?",
    "{} finally learned to sit. Only took eight months.",
    "New squeaky toy lasted eleven minutes. New record low.",
    "{} made a friend at the dog run today!",
    "Reminder: the 23rd St gate is closed for repairs until Friday.",
    "Rainy day. {} is refusing to go outside on principle.",
    "Vet says {} is in great shape. Treats all around."]
posts, n = [], 0
for pack_id, _ in PACKS:
    roster = [GUEST] + [f for f in friends if True]
    for author in random.sample(roster, 4):
        body = BODIES[n % len(BODIES)]
        name = 'Biscuit' if author == GUEST else by_name.get(author, 'The dog')
        posts.append("  ({}, {}, {}, now() - interval '{} hours', {})".format(
            author, pack_id, q(body.format(name)), (n * 7) % 90 + 1,
            q('https://placedog.net/500/400?id={}'.format((n * 17) % 250 + 1))
            if n % 3 == 0 else 'NULL'))
        n += 1
out.append("-- Pack feed posts.")
out.append("INSERT INTO posts (user_id, pack_id, body, date, photo_url) VALUES\n"
           + ",\n".join(posts) + ";")
out.append("")

PLAYDATES = [
    (1, GUEST, 'Morning walk, meet at the 23rd St entrance', 2, 9, 10),
    (2, GUEST, 'Riverside run', 5, 18, 19),
    (3, friends[0], 'Puppy social hour', 9, 14, 16),
    (1, friends[1], 'Weekend park meetup', 12, 11, 13)]
# Anchored to New York rather than to whatever the database server's clock is
# set to: the profiles are all NYC zip codes, so a "morning walk" should be 9am
# there, not 9am UTC.
def playdate_at(days, hour):
    return ("(date_trunc('day', now() AT TIME ZONE 'America/New_York') "
            "+ interval '{} days {} hours') AT TIME ZONE 'America/New_York'"
            .format(days, hour))

out.append("-- Scheduled playdates, relative to whenever the seed is loaded.")
out.append("INSERT INTO playdates (pack_id, user_id, body, start_date, end_date) VALUES\n"
           + ",\n".join(
    "  ({}, {}, {}, {}, {})".format(p, u, q(b), playdate_at(d, sh), playdate_at(d, eh))
    for p, u, b, d, sh, eh in PLAYDATES) + ";")
out.append("")

out.append("-- The inserts above set explicit ids, which leaves the sequences behind.")
out.append("SELECT setval('users_user_id_seq', (SELECT max(user_id) FROM users));")
out.append("SELECT setval('packs_pack_id_seq', (SELECT max(pack_id) FROM packs));")
out.append("")
out.append("COMMIT;")

open('server/db/sql/seed.sql', 'w').write("\n".join(out) + "\n")
print("wrote server/db/sql/seed.sql")
