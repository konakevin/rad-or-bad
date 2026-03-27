-- Migration 013: Re-add voted-post filter to get_feed
-- Migration 011 rewrote get_feed without the LEFT JOIN / WHERE v.upload_id IS NULL
-- filter that excluded already-voted posts. This restores it.

DROP FUNCTION IF EXISTS public.get_feed(uuid, integer);

CREATE FUNCTION public.get_feed(p_user_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(
  id            uuid,
  user_id       uuid,
  categories    text[],
  image_url     text,
  media_type    text,
  thumbnail_url text,
  width         integer,
  height        integer,
  caption       text,
  created_at    timestamptz,
  total_votes   integer,
  rad_votes     integer,
  bad_votes     integer,
  username      text,
  feed_score    double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    up.id,
    up.user_id,
    up.categories,
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
  LEFT JOIN public.votes v
    ON v.upload_id = up.id
    AND v.voter_id = p_user_id
  WHERE up.is_active = true
    AND up.user_id != p_user_id
    AND (up.is_moderated = false OR up.is_approved = true)
    AND v.upload_id IS NULL
  ORDER BY feed_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed(uuid, integer) TO authenticated;
