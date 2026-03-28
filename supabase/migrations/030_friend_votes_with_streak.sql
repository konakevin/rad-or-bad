-- Migration 030: Add streak count to friend votes in get_friends_feed
--
-- Joins vote_streaks to include current_streak per friend in the JSON.
-- Also updates get_friend_votes_on_post for the Everyone/Following feeds.

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
        'vote', friend_vote.vote::text,
        'streak', COALESCE(vs.current_streak, 0)
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
  LEFT JOIN public.vote_streaks vs
    ON vs.user_a = LEAST(p_user_id, friend_vote.voter_id)
    AND vs.user_b = GREATEST(p_user_id, friend_vote.voter_id)
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

-- Also update get_friend_votes_on_post to include streak
DROP FUNCTION IF EXISTS public.get_friend_votes_on_post(uuid, uuid);

CREATE FUNCTION public.get_friend_votes_on_post(p_user_id uuid, p_upload_id uuid)
RETURNS TABLE(
  friend_username text,
  friend_avatar   text,
  friend_rank     text,
  vote            text,
  streak          integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER AS $$
  SELECT
    friend.username  AS friend_username,
    friend.avatar_url AS friend_avatar,
    friend.user_rank  AS friend_rank,
    fv.vote::text     AS vote,
    COALESCE(vs.current_streak, 0) AS streak
  FROM public.votes fv
  JOIN public.users friend ON friend.id = fv.voter_id
  JOIN public.follows f1
    ON f1.follower_id = fv.voter_id AND f1.following_id = p_user_id
  JOIN public.follows f2
    ON f2.follower_id = p_user_id AND f2.following_id = fv.voter_id
  LEFT JOIN public.vote_streaks vs
    ON vs.user_a = LEAST(p_user_id, fv.voter_id)
    AND vs.user_b = GREATEST(p_user_id, fv.voter_id)
  WHERE fv.upload_id = p_upload_id
    AND fv.voter_id != p_user_id
    AND fv.vote IN ('rad', 'bad');
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_votes_on_post(uuid, uuid) TO authenticated;
