-- Drop legacy tables that were superseded by the profiles table (migration 00009)
-- These tables are no longer referenced by application code:
--   - users: thin mirror of auth.users, replaced by profiles
--   - user_preferences: abandoned property search feature, FK points to dead users table
--   - maklare: broker partner profiles, concept absorbed into profiles.roles

DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS maklare;
