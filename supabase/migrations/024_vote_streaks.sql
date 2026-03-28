-- Migration 024: Vote Streaks ("Vibe Sync")
--
-- Tracks consecutive matching votes between mutual follows.
-- Computed by a cron job every 30 minutes using a watermark pattern.
--
-- 1. vote_streaks table (one row per mutual pair)
-- 2. streak_cron_state table (watermark)
-- 3. Indexes
-- 4. RLS
-- 5. refresh_vote_streaks() cron function
-- 6. get_top_streaks() RPC
-- 7. pg_cron schedule

-- ── 1. Tables ────────────────────────────────────────────────────────────────

CREATE TABLE public.vote_streaks (
  user_a          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak  integer NOT NULL DEFAULT 0,
  best_streak     integer NOT NULL DEFAULT 0,
  streak_type     text,  -- 'rad' or 'bad' (type of current streak, null when 0)
  last_upload_id  uuid REFERENCES public.uploads(id) ON DELETE SET NULL,
  last_matched_at timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE public.streak_cron_state (
  id                int PRIMARY KEY DEFAULT 1,
  last_processed_at timestamptz NOT NULL DEFAULT '2000-01-01T00:00:00Z',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.streak_cron_state (id, last_processed_at)
VALUES (1, '2000-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS votes_created_at_idx
  ON public.votes (created_at);

CREATE INDEX IF NOT EXISTS vote_streaks_user_a_streak_idx
  ON public.vote_streaks (user_a, current_streak DESC);

CREATE INDEX IF NOT EXISTS vote_streaks_user_b_streak_idx
  ON public.vote_streaks (user_b, current_streak DESC);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.vote_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Streaks are publicly viewable"
  ON public.vote_streaks FOR SELECT USING (true);

ALTER TABLE public.streak_cron_state ENABLE ROW LEVEL SECURITY;
-- No client policies — only the SECURITY DEFINER function writes/reads this.

-- ── 4. Cron function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_vote_streaks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_watermark     timestamptz;
  v_new_watermark timestamptz;
  rec             RECORD;
BEGIN
  SELECT last_processed_at INTO v_watermark
  FROM public.streak_cron_state WHERE id = 1;

  -- Find the max created_at we'll process (snapshot boundary)
  SELECT MAX(created_at) INTO v_new_watermark
  FROM public.votes
  WHERE created_at > v_watermark;

  -- Nothing new
  IF v_new_watermark IS NULL THEN
    RETURN;
  END IF;

  -- Process all completed vote pairs where at least one vote is new.
  FOR rec IN
    WITH new_votes AS (
      SELECT v.voter_id, v.upload_id, v.vote::text AS vote, v.created_at
      FROM public.votes v
      WHERE v.created_at > v_watermark
        AND v.vote IN ('rad', 'bad')
    ),
    completed_pairs AS (
      SELECT
        LEAST(nv.voter_id, v2.voter_id)    AS user_a,
        GREATEST(nv.voter_id, v2.voter_id) AS user_b,
        nv.upload_id,
        CASE WHEN nv.vote = v2.vote::text THEN true ELSE false END AS is_match,
        CASE WHEN nv.vote = v2.vote::text THEN nv.vote ELSE NULL END AS match_type,
        GREATEST(nv.created_at, v2.created_at) AS pair_time
      FROM new_votes nv
      JOIN public.votes v2
        ON v2.upload_id = nv.upload_id
        AND v2.voter_id != nv.voter_id
        AND v2.vote IN ('rad', 'bad')
      -- Verify mutual follow
      WHERE EXISTS (
        SELECT 1 FROM public.follows f1
        WHERE f1.follower_id = nv.voter_id AND f1.following_id = v2.voter_id
      )
      AND EXISTS (
        SELECT 1 FROM public.follows f2
        WHERE f2.follower_id = v2.voter_id AND f2.following_id = nv.voter_id
      )
    ),
    deduped AS (
      SELECT DISTINCT ON (user_a, user_b, upload_id)
        user_a, user_b, upload_id, is_match, match_type, pair_time
      FROM completed_pairs
    ),
    ordered AS (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY user_a, user_b ORDER BY pair_time ASC) AS rn
      FROM deduped
    )
    SELECT * FROM ordered
    ORDER BY user_a, user_b, rn
  LOOP
    INSERT INTO public.vote_streaks (user_a, user_b, current_streak, best_streak, streak_type, last_upload_id, last_matched_at, updated_at)
    VALUES (
      rec.user_a,
      rec.user_b,
      CASE WHEN rec.is_match THEN 1 ELSE 0 END,
      CASE WHEN rec.is_match THEN 1 ELSE 0 END,
      rec.match_type,
      rec.upload_id,
      rec.pair_time,
      now()
    )
    ON CONFLICT (user_a, user_b) DO UPDATE SET
      current_streak = CASE
        WHEN rec.pair_time > COALESCE(vote_streaks.last_matched_at, '1970-01-01'::timestamptz) THEN
          CASE WHEN rec.is_match
            THEN vote_streaks.current_streak + 1
            ELSE 0
          END
        ELSE vote_streaks.current_streak
      END,
      best_streak = GREATEST(
        vote_streaks.best_streak,
        CASE
          WHEN rec.pair_time > COALESCE(vote_streaks.last_matched_at, '1970-01-01'::timestamptz)
            AND rec.is_match
          THEN vote_streaks.current_streak + 1
          ELSE vote_streaks.current_streak
        END
      ),
      streak_type = CASE
        WHEN rec.pair_time > COALESCE(vote_streaks.last_matched_at, '1970-01-01'::timestamptz) THEN
          CASE WHEN rec.is_match THEN rec.match_type ELSE NULL END
        ELSE vote_streaks.streak_type
      END,
      last_upload_id = CASE
        WHEN rec.pair_time > COALESCE(vote_streaks.last_matched_at, '1970-01-01'::timestamptz)
        THEN rec.upload_id
        ELSE vote_streaks.last_upload_id
      END,
      last_matched_at = CASE
        WHEN rec.pair_time > COALESCE(vote_streaks.last_matched_at, '1970-01-01'::timestamptz)
        THEN rec.pair_time
        ELSE vote_streaks.last_matched_at
      END,
      updated_at = now();
  END LOOP;

  -- Advance watermark
  UPDATE public.streak_cron_state
  SET last_processed_at = v_new_watermark, updated_at = now()
  WHERE id = 1;
END;
$$;

-- ── 5. Top streaks RPC ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_top_streaks(p_user_id uuid)
RETURNS TABLE (
  friend_id       uuid,
  friend_username text,
  friend_avatar   text,
  friend_rank     text,
  current_streak  integer,
  best_streak     integer,
  streak_type     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER AS $$
  SELECT
    friend.id           AS friend_id,
    friend.username      AS friend_username,
    friend.avatar_url    AS friend_avatar,
    friend.user_rank     AS friend_rank,
    vs.current_streak,
    vs.best_streak,
    vs.streak_type
  FROM public.vote_streaks vs
  JOIN public.users friend
    ON friend.id = CASE
      WHEN vs.user_a = p_user_id THEN vs.user_b
      ELSE vs.user_a
    END
  WHERE (vs.user_a = p_user_id OR vs.user_b = p_user_id)
    AND vs.current_streak > 0
  ORDER BY vs.current_streak DESC, vs.best_streak DESC
  LIMIT 3;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_streaks(uuid) TO authenticated;

-- ── 6. Cron schedule ─────────────────────────────────────────────────────────

SELECT cron.schedule(
  'refresh-vote-streaks',
  '*/30 * * * *',
  'SELECT public.refresh_vote_streaks()'
);

-- ── 7. Initial seed — process all historical votes ───────────────────────────
SELECT public.refresh_vote_streaks();
