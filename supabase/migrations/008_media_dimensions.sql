-- Migration 008: media dimensions
-- Adds width and height to uploads for aspect ratio detection, updates get_feed RPC

-- Step 1: add columns (nullable — existing posts won't have dimensions)
ALTER TABLE public.uploads
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer;

-- Step 2: drop old function signature
DROP FUNCTION IF EXISTS public.get_feed(uuid, integer);

-- Step 3: recreate with new return type
CREATE FUNCTION public.get_feed(p_user_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  category text,
  image_url text,
  media_type text,
  thumbnail_url text,
  width integer,
  height integer,
  caption text,
  created_at timestamptz,
  total_votes integer,
  rad_votes integer,
  bad_votes integer,
  username text,
  feed_score double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    up.id,
    up.user_id,
    up.category::text,
    up.image_url,
    up.media_type,
    up.thumbnail_url,
    up.width,
    up.height,
    up.caption,
    up.created_at,
    up.total_votes,
    up.rad_votes,
    up.bad_votes,
    u.username,
    (
      COALESCE(up.wilson_score, 0) * 0.6 +
      CASE WHEN follows.following_id IS NOT NULL THEN 0.3 ELSE 0.0 END +
      EXTRACT(EPOCH FROM (now() - up.created_at)) * -0.00001
    ) AS feed_score
  FROM public.uploads up
  JOIN public.users u ON u.id = up.user_id
  LEFT JOIN public.follows follows
    ON follows.follower_id = p_user_id
    AND follows.following_id = up.user_id
  WHERE up.is_active = true
    AND up.user_id != p_user_id
    AND (up.is_moderated = false OR up.is_approved = true)
  ORDER BY feed_score DESC
  LIMIT p_limit;
$$;
