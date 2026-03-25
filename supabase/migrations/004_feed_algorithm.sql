-- =============================================
-- Dope or Nope — Feed Algorithm
-- =============================================
-- Strategy: pre-compute wilson_score on the uploads
-- row itself so the feed query does zero heavy math.
-- A BEFORE UPDATE trigger keeps it in sync whenever
-- vote counts change.  Time decay at query time is
-- cheap CASE WHEN timestamp comparisons only.
-- =============================================

-- ── wilson_score column ───────────────────────────────────────────────────────
alter table public.uploads
  add column if not exists wilson_score double precision default 0.0 not null;

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Remove superseded index from earlier iteration if it exists
drop index if exists uploads_active_idx;

-- Feed query: fast scan of active/approved uploads ordered by quality
create index if not exists uploads_feed_idx
  on public.uploads(wilson_score desc)
  where is_active = true and (is_approved is null or is_approved = true);

-- Voted-post filter: avoids seq-scan on votes for each candidate
create index if not exists votes_voter_upload_idx
  on public.votes(voter_id, upload_id);

-- ── Wilson Score helper ───────────────────────────────────────────────────────
-- IMMUTABLE + LANGUAGE sql → planner can inline / cache freely.
-- Lower bound of a 95% confidence interval on the true gas rate.
-- High-vote posts are trusted; low-vote posts are penalised.
create or replace function public.wilson_lower_bound(gas integer, total integer)
returns double precision
language sql immutable as $$
  select case
    when total = 0 then 0.0
    else (
      (gas::double precision / total)
        + 3.84 / (2.0 * total)
        - 1.96 * sqrt(
            (gas::double precision / total)
            * (1.0 - gas::double precision / total) / total
            + 3.84 / (4.0 * total * total)
          )
    ) / (1.0 + 3.84 / total)
  end;
$$;

-- ── Trigger: keep wilson_score in sync ────────────────────────────────────────
-- Fires BEFORE UPDATE on uploads when rad_votes or total_votes change.
-- Sets NEW.wilson_score directly — no second round-trip needed.
create or replace function public.refresh_wilson_score()
returns trigger
language plpgsql as $$
begin
  new.wilson_score := public.wilson_lower_bound(new.rad_votes, new.total_votes);
  return new;
end;
$$;

drop trigger if exists sync_wilson_score on public.uploads;
create trigger sync_wilson_score
  before update of rad_votes, total_votes on public.uploads
  for each row
  execute function public.refresh_wilson_score();

-- Backfill existing rows
update public.uploads
set wilson_score = public.wilson_lower_bound(rad_votes, total_votes);

-- ── get_feed RPC ──────────────────────────────────────────────────────────────
-- LANGUAGE sql (not plpgsql) avoids PL/pgSQL variable scoping issues and
-- lets the planner reason about the query more freely.
-- Following boost is derived via CTEs so no DECLARE block is needed.
create or replace function public.get_feed(
  p_user_id uuid,
  p_limit    integer default 50
)
returns table (
  id          uuid,
  user_id     uuid,
  category    public.category,
  image_url   text,
  caption     text,
  created_at  timestamptz,
  total_votes integer,
  rad_votes   integer,
  bad_votes  integer,
  username    text,
  feed_score  double precision
)
language sql
security definer
as $$
  with
    -- User's engagement stats (single row)
    user_stats as (
      select
        coalesce(u.total_ratings_given, 0) as ratings,
        (select count(*)::integer from public.follows where follower_id = p_user_id) as follows
      from public.users u
      where u.id = p_user_id
    ),
    -- Derive the following boost multiplier (single row)
    user_boost as (
      select case
        when follows = 0  or ratings < 20  then 1.0
        when follows <= 5 or ratings < 100 then 1.6
        when follows <= 20 or ratings < 500 then 2.0
        else 3.0
      end::double precision as boost
      from user_stats
    ),
    -- Accounts this user follows (for the join below)
    following as (
      select following_id from public.follows where follower_id = p_user_id
    ),
    -- Candidate pool: top quality posts UNION recent posts.
    -- Caps the rows the main query scores and sorts, keeping it fast at scale.
    -- With a small dataset this is a no-op (pool > total posts).
    -- The UNION ensures new posts (wilson_score = 0) are never crowded out
    -- by old posts just because the quality pool filled up first.
    candidates as (
      (
        -- Top posts by pre-computed quality score (uses uploads_feed_idx)
        select up.id
        from public.uploads up
        where up.is_active = true
          and (up.is_approved = true or up.is_approved is null)
          and up.user_id != p_user_id
        order by up.wilson_score desc
        limit 4000
      )
      union
      (
        -- All posts from the last 7 days regardless of score,
        -- so fresh content always has a chance to appear
        select up.id
        from public.uploads up
        where up.is_active = true
          and (up.is_approved = true or up.is_approved is null)
          and up.user_id != p_user_id
          and up.created_at > now() - interval '7 days'
        limit 1000
      )
    )
  select
    up.id,
    up.user_id,
    up.category,
    up.image_url,
    up.caption,
    up.created_at,
    up.total_votes,
    up.rad_votes,
    up.bad_votes,
    usr.username,
    (
      (
        -- Pre-computed quality (no SQRT/POWER at query time)
        up.wilson_score

        -- Cheap recency boost: timestamp comparisons only
        * case
            when up.created_at > now() - interval '6 hours'  then 4.0
            when up.created_at > now() - interval '24 hours' then 2.0
            when up.created_at > now() - interval '72 hours' then 1.4
            when up.created_at > now() - interval '7 days'   then 1.1
            else 1.0
          end

        -- New posts with no votes get a small discovery bump
        + case
            when up.total_votes = 0
             and up.created_at > now() - interval '12 hours' then 0.3
            else 0.0
          end
      )
      * case when f.following_id is not null then ub.boost else 1.0 end
    )::double precision as feed_score

  from candidates c
  join  public.uploads up  on up.id = c.id
  join  public.users   usr on usr.id = up.user_id
  cross join user_boost ub
  left  join following   f  on f.following_id = up.user_id
  left  join public.votes v  on v.upload_id = up.id and v.voter_id = p_user_id

  where v.upload_id is null

  order by feed_score desc
  limit p_limit;
$$;

grant execute on function public.get_feed(uuid, integer)              to authenticated;
grant execute on function public.wilson_lower_bound(integer, integer) to authenticated;
