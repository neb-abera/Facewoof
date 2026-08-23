-- Whether a person has finished setting up their profile.
--
-- Only ever unset for an account created by signing in with a provider: a
-- demo account is cloned from the template, so it arrives with a dog, photos
-- and a roster of neighbours already around it. Someone arriving through
-- Google or Microsoft has none of that, and without somewhere to send them
-- they landed on an empty discover feed with no way to understand why.
ALTER TABLE users ADD COLUMN onboarded_at timestamptz;

-- Everyone who already has a dog on file has, by any useful definition, been
-- through this. Backfilled so no existing account is sent to onboarding.
UPDATE users SET onboarded_at = created_at WHERE dog_name IS NOT NULL;
