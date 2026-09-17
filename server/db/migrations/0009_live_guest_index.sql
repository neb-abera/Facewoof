-- Counting live demo accounts, cheaply.
--
-- Signing in as a guest now checks a ceiling on how many demo accounts exist
-- (GUEST_MAX_LIVE): the per-address rate limit bounds one caller, and nothing
-- bounded many. Each demo account brings a hundred roster copies with it, all
-- flagged is_guest, so the existing cleanup index covers a hundred times more
-- rows than this count needs. Demo ACCOUNTS are the guests that are nobody's
-- copy.
CREATE INDEX users_live_guest_accounts_idx ON users (created_at)
  WHERE is_guest AND demo_of IS NULL;
