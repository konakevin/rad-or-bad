-- Migration 009: feature flags table
-- A simple key/value store for server-driven feature flags.
-- Values are booleans. Add new flags via INSERT — no code deploy needed.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         text PRIMARY KEY,
  value       boolean NOT NULL DEFAULT false,
  description text
);

-- Disable swipe-to-skip on the home feed
INSERT INTO public.feature_flags (key, value, description)
VALUES ('homeSwipeToSkipEnabled', false, 'Allow users to swipe up to skip a card on the home feed without voting');
