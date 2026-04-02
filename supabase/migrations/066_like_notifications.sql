-- Migration 066: Send notification when someone likes a post

-- Add post_like to allowed notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_comment', 'comment_reply', 'comment_mention', 'post_share', 'friend_request', 'friend_accepted', 'post_milestone', 'dream_generated', 'post_like'));

-- Trigger: notify post owner when someone likes their post
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  post_owner_id uuid;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM uploads WHERE id = NEW.upload_id;

  -- Don't notify if liking your own post
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, upload_id)
    VALUES (post_owner_id, NEW.user_id, 'post_like', NEW.upload_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();
