-- Migration 029: Fix SECURITY DEFINER on friends feed + following feed
--
-- Both get_friends_feed and get_following_feed were missing SECURITY DEFINER,
-- causing them to return 0 rows when called as authenticated user due to RLS.
-- get_feed has it (set in migration 023), these need it too.

DROP FUNCTION IF EXISTS public.get_friends_feed(uuid, integer);

CREATE FUNCTION public.get_friends_feed(p_user_id uuid, p_limit integer DEFAULT 50)
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
  user_rank     text,
  avatar_url    text,
  feed_score    double precision,
  friend_votes  jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    u.user_rank,
    u.avatar_url,
    0.0 AS feed_score,
    json_agg(
      json_build_object(
        'username', friend.username,
        'avatar_url', friend.avatar_url,
        'user_rank', friend.user_rank,
        'vote', friend_vote.vote::text
      )
    )::jsonb AS friend_votes
  FROM public.uploads up
  JOIN public.users u ON u.id = up.user_id
  JOIN public.votes friend_vote ON friend_vote.upload_id = up.id
  JOIN public.users friend ON friend.id = friend_vote.voter_id
  JOIN public.follows f1
    ON f1.follower_id = friend_vote.voter_id
    AND f1.following_id = p_user_id
  JOIN public.follows f2
    ON f2.follower_id = p_user_id
    AND f2.following_id = friend_vote.voter_id
  LEFT JOIN public.votes my_vote
    ON my_vote.upload_id = up.id
    AND my_vote.voter_id = p_user_id
  WHERE up.is_active = true
    AND up.user_id != p_user_id
    AND (up.is_moderated = false OR up.is_approved = true)
    AND friend_vote.vote IN ('rad', 'bad')
    AND my_vote.id IS NULL
  GROUP BY up.id, up.user_id, up.categories, up.image_url, up.media_type,
           up.thumbnail_url, up.width, up.height, up.caption, up.created_at,
           up.total_votes, up.rad_votes, up.bad_votes, u.username, u.user_rank, u.avatar_url
  ORDER BY up.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_feed(uuid, integer) TO authenticated;

-- Fix get_following_feed too
DROP FUNCTION IF EXISTS public.get_following_feed(uuid, integer);

CREATE FUNCTION public.get_following_feed(p_user_id uuid, p_limit integer DEFAULT 50)
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
  user_rank     text,
  avatar_url    text,
  feed_score    double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    u.user_rank,
    u.avatar_url,
    0.0 AS feed_score
  FROM public.uploads up
  JOIN public.users u ON u.id = up.user_id
  JOIN public.follows f ON f.following_id = up.user_id AND f.follower_id = p_user_id
  LEFT JOIN public.votes my_vote
    ON my_vote.upload_id = up.id
    AND my_vote.voter_id = p_user_id
  WHERE up.is_active = true
    AND up.user_id != p_user_id
    AND (up.is_moderated = false OR up.is_approved = true)
    AND my_vote.id IS NULL
  ORDER BY up.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_following_feed(uuid, integer) TO authenticated;
