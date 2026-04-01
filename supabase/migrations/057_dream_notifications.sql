-- Migration 057: Dream wish + dream notification type

-- Dream wish column
ALTER TABLE public.user_recipes ADD COLUMN IF NOT EXISTS dream_wish text DEFAULT NULL;

-- Add dream_generated notification type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_comment', 'comment_reply', 'comment_mention', 'post_share', 'friend_request', 'friend_accepted', 'post_milestone', 'dream_generated'));
