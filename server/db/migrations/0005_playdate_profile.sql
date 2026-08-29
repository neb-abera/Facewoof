-- What a profile needs to say for someone to judge a playdate.
--
-- Name, breed and a photo say who a dog is; none of it answers the questions
-- an owner actually asks before agreeing to meet: is this dog my dog's size,
-- will their energy match, and when are they free. The profile page showed
-- nothing to that end, so matches had to work it out in the pack feed.
--
-- All nullable: existing profiles and the demo roster simply have nothing to
-- say yet, and the profile page treats absence as "not filled in" rather than
-- rendering empty chips.
ALTER TABLE users ADD COLUMN size text;
ALTER TABLE users ADD COLUMN energy text;
ALTER TABLE users ADD COLUMN best_time text;
ALTER TABLE users ADD COLUMN bio text;
