-- Migration 028: Single-post friend votes RPC
--
-- Lightweight query to check if mutual follows voted on a specific post.
-- Called AFTER the user votes (not on feed load) for the friend reveal pill.

CREATE FUNCTION public.get_friend_votes_on_post(p_user_id uuid, p_upload_id uuid)
RETURNS TABLE(
  friend_username text,
  friend_avatar   text,
  friend_rank     text,
  vote            text
)
LANGUAGE sql
STABLE
SECURITY DEFINER AS $$
  SELECT
    friend.username  AS friend_username,
    friend.avatar_url AS friend_avatar,
    friend.user_rank  AS friend_rank,
    fv.vote::text     AS vote
  FROM public.votes fv
  JOIN public.users friend ON friend.id = fv.voter_id
  -- Mutual follow check
  JOIN public.follows f1
    ON f1.follower_id = fv.voter_id AND f1.following_id = p_user_id
  JOIN public.follows f2
    ON f2.follower_id = p_user_id AND f2.following_id = fv.voter_id
  WHERE fv.upload_id = p_upload_id
    AND fv.voter_id != p_user_id
    AND fv.vote IN ('rad', 'bad');
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_votes_on_post(uuid, uuid) TO authenticated;
