-- Migration 067: Twin Dreams + Family system
-- Twins = same prompt re-rolled. Fuses = blended recipe.
-- Both link back to the source post via twin_of / fuse_of.

-- ── New columns on uploads ──────────────────────────────────────────────────
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS twin_of uuid REFERENCES public.uploads(id) ON DELETE SET NULL;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS twin_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS fuse_of uuid REFERENCES public.uploads(id) ON DELETE SET NULL;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS fuse_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_uploads_twin_of ON public.uploads(twin_of) WHERE twin_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uploads_fuse_of ON public.uploads(fuse_of) WHERE fuse_of IS NOT NULL;

-- ── Twin count trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_twin_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.twin_of IS NOT NULL THEN
    UPDATE uploads SET twin_count = twin_count + 1 WHERE id = NEW.twin_of;
  ELSIF TG_OP = 'DELETE' AND OLD.twin_of IS NOT NULL THEN
    UPDATE uploads SET twin_count = twin_count - 1 WHERE id = OLD.twin_of;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_twin_count
  AFTER INSERT OR DELETE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_twin_count();

-- ── Fuse count trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_fuse_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.fuse_of IS NOT NULL THEN
    UPDATE uploads SET fuse_count = fuse_count + 1 WHERE id = NEW.fuse_of;
  ELSIF TG_OP = 'DELETE' AND OLD.fuse_of IS NOT NULL THEN
    UPDATE uploads SET fuse_count = fuse_count - 1 WHERE id = OLD.fuse_of;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_fuse_count
  AFTER INSERT OR DELETE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_fuse_count();

-- ── Notification types ──────────────────────────────────────────────────────
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_comment', 'comment_reply', 'comment_mention', 'post_share',
    'friend_request', 'friend_accepted', 'post_milestone', 'dream_generated',
    'post_like', 'post_twin', 'post_fuse'));

-- ── Twin notification trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_post_twin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  post_owner_id uuid;
BEGIN
  IF NEW.twin_of IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO post_owner_id FROM uploads WHERE id = NEW.twin_of;
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, upload_id)
    VALUES (post_owner_id, NEW.user_id, 'post_twin', NEW.twin_of);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_post_twin
  AFTER INSERT ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_twin();

-- ── Fuse notification trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_post_fuse()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  post_owner_id uuid;
BEGIN
  IF NEW.fuse_of IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO post_owner_id FROM uploads WHERE id = NEW.fuse_of;
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, upload_id)
    VALUES (post_owner_id, NEW.user_id, 'post_fuse', NEW.fuse_of);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_post_fuse
  AFTER INSERT ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_fuse();
