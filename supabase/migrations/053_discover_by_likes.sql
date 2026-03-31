-- Migration 053: Discover dreamers by shared likes (replaces vote-based suggestions)

DROP FUNCTION IF EXISTS public.get_vibe_suggestions(uuid, integer);

CREATE FUNCTION public.get_vibe_suggestions(p_user_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(
  user_id       uuid,
  username      text,
  avatar_url    text,
  user_rank     text,
  vibe_score    integer,
  shared_count  integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  like_count integer;
BEGIN
  SELECT COUNT(*) INTO like_count FROM favorites WHERE favorites.user_id = p_user_id;

  IF like_count >= 3 THEN
    -- Find users who liked the same posts
    RETURN QUERY
    SELECT
      u.id AS user_id,
      u.username,
      u.avatar_url,
      NULL::text AS user_rank,
      (COUNT(*)::integer * 100 / GREATEST(like_count, 1))::integer AS vibe_score,
      COUNT(*)::integer AS shared_count
    FROM favorites f
    JOIN users u ON u.id = f.user_id
    WHERE f.upload_id IN (SELECT fav.upload_id FROM favorites fav WHERE fav.user_id = p_user_id)
      AND f.user_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM friendships fr
        WHERE fr.user_a = LEAST(p_user_id, f.user_id)
          AND fr.user_b = GREATEST(p_user_id, f.user_id)
      )
    GROUP BY u.id, u.username, u.avatar_url
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
    LIMIT p_limit;
  ELSE
    -- Fallback: popular accounts for new users
    RETURN QUERY
    SELECT
      u.id AS user_id,
      u.username,
      u.avatar_url,
      NULL::text AS user_rank,
      0::integer AS vibe_score,
      0::integer AS shared_count
    FROM users u
    WHERE u.id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM friendships fr
        WHERE fr.user_a = LEAST(p_user_id, u.id)
          AND fr.user_b = GREATEST(p_user_id, u.id)
      )
      AND EXISTS (SELECT 1 FROM uploads WHERE uploads.user_id = u.id AND is_active = true)
    ORDER BY (SELECT COUNT(*) FROM uploads WHERE uploads.user_id = u.id AND is_active = true) DESC
    LIMIT p_limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vibe_suggestions(uuid, integer) TO authenticated;
