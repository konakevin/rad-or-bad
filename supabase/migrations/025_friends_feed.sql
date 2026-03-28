-- Migration 025: Friends Feed RPC
--
-- Returns posts that mutual follows have voted on but the user hasn't.
-- Same return shape as get_feed so FeedItem type works unchanged.

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
  feed_score    double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (up.id)
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
  -- At least one mutual follow voted on this post
  JOIN public.votes friend_vote ON friend_vote.upload_id = up.id
  -- The voter follows me
  JOIN public.follows f1
    ON f1.follower_id = friend_vote.voter_id
    AND f1.following_id = p_user_id
  -- I follow the voter (mutual)
  JOIN public.follows f2
    ON f2.follower_id = p_user_id
    AND f2.following_id = friend_vote.voter_id
  -- I haven't voted on this post
  LEFT JOIN public.votes my_vote
    ON my_vote.upload_id = up.id
    AND my_vote.voter_id = p_user_id
  WHERE up.is_active = true
    AND up.user_id != p_user_id
    AND (up.is_moderated = false OR up.is_approved = true)
    AND friend_vote.vote IN ('rad', 'bad')
    AND my_vote.id IS NULL
  ORDER BY up.id, up.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_feed(uuid, integer) TO authenticated;
