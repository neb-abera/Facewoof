-- Whether a person has finished setting up their profile.
--
-- Only ever unset for an account created by signing in with a provider: a
-- demo account is cloned from the template, so it arrives with a dog, photos
-- and a roster of neighbours already around it. Someone arriving through
-- Google or Microsoft has none of that, and without somewhere to send them
-- they landed on an empty discover feed with no way to understand why.
ALTER TABLE users ADD COLUMN onboarded_at timestamptz;

-- Every account that exists at this point predates provider sign-in, so none
-- of them can be the half-built kind this column is for. Backfilling all of
-- them — rather than only those with a dog on file — means no existing person
-- is ever sent through a setup screen for an account they already had.
UPDATE users SET onboarded_at = COALESCE(created_at, now()) WHERE onboarded_at IS NULL;
