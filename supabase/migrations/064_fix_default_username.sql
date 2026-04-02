-- Migration 062: Better default usernames for Apple Sign-In users
-- Falls back to full_name, then generates a friendly random name instead of email prefix

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  chosen_username text;
BEGIN
  -- Priority: explicit username > full_name first word > friendly random
  chosen_username := COALESCE(
    NULLIF(new.raw_user_meta_data->>'username', ''),
    LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), ''), ' ', 1), '[^a-z0-9]', '', 'g')),
    'dreamer' || FLOOR(RANDOM() * 9000 + 1000)::text
  );

  INSERT INTO public.users (id, email, username)
  VALUES (new.id, new.email, chosen_username);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
