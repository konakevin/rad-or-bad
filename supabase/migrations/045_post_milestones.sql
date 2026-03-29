-- Migration 045: Post milestone notifications
-- Fires when a post's rad_votes crosses a threshold (5, 10, 25, 50, 100, 250, 500, 1000).
-- Creates a notification for the post owner.

-- Add milestone notification type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_comment', 'comment_reply', 'comment_mention', 'post_share', 'friend_request', 'friend_accepted', 'post_milestone'));

-- Trigger function: check if rad_votes just crossed a milestone threshold
CREATE OR REPLACE FUNCTION check_post_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_post_owner_id uuid;
  v_rad_votes integer;
  v_thresholds integer[] := ARRAY[5, 10, 25, 50, 100, 250, 500, 1000];
  v_threshold integer;
BEGIN
  -- Only check rad votes
  IF NEW.vote != 'rad' THEN RETURN NEW; END IF;

  -- Get current rad_votes for the post
  SELECT rad_votes, user_id INTO v_rad_votes, v_post_owner_id
  FROM uploads WHERE id = NEW.upload_id;

  -- Don't notify for own votes
  IF v_post_owner_id = NEW.voter_id THEN RETURN NEW; END IF;

  -- Check each threshold
  FOREACH v_threshold IN ARRAY v_thresholds LOOP
    -- rad_votes equals threshold means we JUST crossed it
    IF v_rad_votes = v_threshold THEN
      INSERT INTO notifications (recipient_id, actor_id, type, upload_id, body)
      VALUES (
        v_post_owner_id,
        NEW.voter_id,
        'post_milestone',
        NEW.upload_id,
        v_threshold || ' Rad votes!'
      );
      EXIT; -- Only one milestone per vote
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_milestone ON votes;
CREATE TRIGGER trg_post_milestone
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION check_post_milestone();
