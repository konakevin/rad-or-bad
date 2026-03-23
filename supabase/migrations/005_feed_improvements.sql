-- =============================================
-- Dope or Nope — Feed Improvements
-- =============================================
-- 1. Pass vote penalty   — active dislikes reduce score beyond Wilson alone
-- 2. Smooth time decay   — continuous power-law curve, no cliff edges
--                          Formula: 1 + 3 / (age_hours/6 + 1)^1.2
-- 3. Author diversity    — cap each author at 2 posts in the feed
-- 4. Category affinity   — ±20% boost/penalty based on user's vote history
-- =============================================

-- ── user_category_affinity ────────────────────────────────────────────────────
create table if not exists public.user_category_affinity (
  user_id    uuid references public.users(id) on delete cascade not null,
  category   public.category not null,
  gas_count  integer default 0 not null,
  pass_count integer default 0 not null,
  primary key (user_id, category)
);

create index if not exists affinity_user_idx
  on public.user_category_affinity(user_id);

alter table public.user_category_affinity enable row level security;

create policy "Users can view own affinity"
  on public.user_category_affinity for select
  using (auth.uid() = user_id);

-- ── Affinity trigger ──────────────────────────────────────────────────────────
create or replace function public.handle_vote_affinity()
returns trigger
language plpgsql security definer as $$
declare
  v_category public.category;
begin
  if new.vote not in ('gas', 'pass') then
    return new;
  end if;

  select category into v_category
  from public.uploads
  where id = new.upload_id;

  insert into public.user_category_affinity (user_id, category, gas_count, pass_count)
  values (
    new.voter_id,
    v_category,
    case when new.vote = 'gas'  then 1 else 0 end,
    case when new.vote = 'pass' then 1 else 0 end
  )
  on conflict (user_id, category) do update
  set
    gas_count  = user_category_affinity.gas_count
                 + case when new.vote = 'gas'  then 1 else 0 end,
    pass_count = user_category_affinity.pass_count
                 + case when new.vote = 'pass' then 1 else 0 end;

  return new;
end;
$$;

drop trigger if exists on_vote_update_affinity on public.votes;
create trigger on_vote_update_affinity
  after insert on public.votes
  for each row execute function public.handle_vote_affinity();

-- ── Backfill affinity from existing votes ─────────────────────────────────────
insert into public.user_category_affinity (user_id, category, gas_count, pass_count)
select
  v.voter_id,
  u.category,
  cast(count(*) filter (where v.vote = 'gas')  as integer),
  cast(count(*) filter (where v.vote = 'pass') as integer)
from public.votes v
join public.uploads u on u.id = v.upload_id
where v.vote in ('gas', 'pass')
group by v.voter_id, u.category
on conflict (user_id, category) do update
set
  gas_count  = excluded.gas_count,
  pass_count = excluded.pass_count;

-- ── Updated get_feed ──────────────────────────────────────────────────────────
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
  gas_votes   integer,
  pass_votes  integer,
  username    text,
  feed_score  double precision
)
language sql
security definer
as $$
  with
    user_stats as (
      select
        coalesce(u.total_ratings_given, 0) as ratings,
        cast((select count(*) from public.follows where follower_id = p_user_id) as integer) as follows
      from public.users u
      where u.id = p_user_id
    ),
    user_boost as (
      select cast(
        case
          when follows = 0  or ratings < 20  then 1.0
          when follows <= 5 or ratings < 100 then 1.6
          when follows <= 20 or ratings < 500 then 2.0
          else 3.0
        end
      as double precision) as boost
      from user_stats
    ),
    following as (
      select following_id from public.follows where follower_id = p_user_id
    ),
    affinity as (
      select
        category,
        (gas_count + 1.0) / (gas_count + pass_count + 2.0) as rate
      from public.user_category_affinity
      where user_id = p_user_id
    ),
    candidates as (
      (
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
        select up.id
        from public.uploads up
        where up.is_active = true
          and (up.is_approved = true or up.is_approved is null)
          and up.user_id != p_user_id
          and up.created_at > now() - interval '7 days'
        limit 1000
      )
    ),
    scored as (
      select
        up.id,
        up.user_id,
        up.category,
        up.image_url,
        up.caption,
        up.created_at,
        up.total_votes,
        up.gas_votes,
        up.pass_votes,
        usr.username,
        -- Quality × smooth decay × pass penalty + discovery bump
        -- then × following boost × category affinity
        (
          (
            up.wilson_score
            * (1.0 + 3.0 / power(
                extract(epoch from (now() - up.created_at)) / 21600.0 + 1.0,
                1.2
              ))
            * case
                when up.total_votes = 0 then 1.0
                else 1.0 - (cast(up.pass_votes as double precision) / up.total_votes) * 0.3
              end
            + case
                when up.total_votes = 0
                 and up.created_at > now() - interval '12 hours' then 0.3
                else 0.0
              end
          )
          * case when f.following_id is not null then ub.boost else 1.0 end
          * case
              when a.rate is null  then 1.0
              when a.rate > 0.65   then 1.2
              when a.rate < 0.35   then 0.8
              else 1.0
            end
        ) as feed_score
      from candidates c
      join  public.uploads up  on up.id = c.id
      join  public.users   usr on usr.id = up.user_id
      cross join user_boost ub
      left  join following  f  on f.following_id = up.user_id
      left  join public.votes v on v.upload_id = up.id and v.voter_id = p_user_id
      left  join affinity   a  on a.category = up.category
      where v.upload_id is null
    ),
    diverse as (
      select
        *,
        row_number() over (
          partition by user_id
          order by feed_score desc
        ) as author_rank
      from scored
    )
  select id, user_id, category, image_url, caption, created_at,
         total_votes, gas_votes, pass_votes, username, feed_score
  from diverse
  where author_rank <= 2
  order by feed_score desc
  limit p_limit;
$$;

grant execute on function public.get_feed(uuid, integer) to authenticated;
