-- Migration 054: Update get_public_profile to remove dropped columns
-- user_rank and rad_score were dropped in migration 051

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  id              uuid,
  username        text,
  avatar_url      text,
  post_count      bigint,
  follower_count  bigint,
  following_count bigint,
  friend_count    bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER AS $$
  SELECT
    u.id, u.username, u.avatar_url,
    (SELECT COUNT(*) FROM public.uploads up WHERE up.user_id = u.id AND up.is_active = true) AS post_count,
    (SELECT COUNT(*) FROM public.follows f WHERE f.following_id = u.id) AS follower_count,
    (SELECT COUNT(*) FROM public.follows f WHERE f.follower_id = u.id) AS following_count,
    (SELECT COUNT(*) FROM public.friendships fs
     WHERE (fs.user_a = u.id OR fs.user_b = u.id) AND fs.status = 'accepted') AS friend_count
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
