-- =============================================
-- Rad or Bad — Rename gas/pass to rad/bad
-- =============================================

-- ── Rename enum values ────────────────────────────────────────────────────────
alter type public.vote_type rename value 'gas'  to 'rad';
alter type public.vote_type rename value 'pass' to 'bad';

-- ── Rename columns on uploads ─────────────────────────────────────────────────
alter table public.uploads rename column gas_votes  to rad_votes;
alter table public.uploads rename column pass_votes to bad_votes;

-- ── Rename columns on user_category_affinity ──────────────────────────────────
alter table public.user_category_affinity rename column gas_count  to rad_count;
alter table public.user_category_affinity rename column pass_count to bad_count;

-- ── Recreate uploads_with_score view ─────────────────────────────────────────
create or replace view public.uploads_with_score as
  select
    *,
    case
      when total_votes = 0 then null
      else round((rad_votes::decimal / total_votes) * 100, 1)
    end as hotness_score
  from public.uploads
  where is_active = true and (is_approved = true or is_approved is null);

-- ── Recreate handle_new_vote trigger function ─────────────────────────────────
create or replace function public.handle_new_vote()
returns trigger as $$
begin
  if new.vote = 'rad' then
    update public.uploads
    set total_votes = total_votes + 1, rad_votes = rad_votes + 1
    where id = new.upload_id;
  elsif new.vote = 'bad' then
    update public.uploads
    set total_votes = total_votes + 1, bad_votes = bad_votes + 1
    where id = new.upload_id;
  end if;

  update public.users
  set
    total_ratings_given = total_ratings_given + 1,
    critic_level = case
      when total_ratings_given + 1 >= 10000 then 6
      when total_ratings_given + 1 >= 5000  then 5
      when total_ratings_given + 1 >= 1000  then 4
      when total_ratings_given + 1 >= 500   then 3
      when total_ratings_given + 1 >= 100   then 2
      else 1
    end
  where id = new.voter_id;

  return new;
end;
$$ language plpgsql security definer;

-- ── Recreate handle_vote_affinity trigger function ────────────────────────────
create or replace function public.handle_vote_affinity()
returns trigger
language plpgsql security definer as $$
declare
  v_category public.category;
begin
  if new.vote not in ('rad', 'bad') then
    return new;
  end if;

  select category into v_category
  from public.uploads
  where id = new.upload_id;

  insert into public.user_category_affinity (user_id, category, rad_count, bad_count)
  values (
    new.voter_id,
    v_category,
    case when new.vote = 'rad' then 1 else 0 end,
    case when new.vote = 'bad' then 1 else 0 end
  )
  on conflict (user_id, category) do update
  set
    rad_count = user_category_affinity.rad_count
                + case when new.vote = 'rad' then 1 else 0 end,
    bad_count = user_category_affinity.bad_count
                + case when new.vote = 'bad' then 1 else 0 end;

  return new;
end;
$$;

-- ── Recreate refresh_wilson_score trigger function ────────────────────────────
create or replace function public.refresh_wilson_score()
returns trigger
language plpgsql as $$
begin
  new.wilson_score := public.wilson_lower_bound(new.rad_votes, new.total_votes);
  return new;
end;
$$;

-- Update the wilson trigger to fire on rad_votes instead of gas_votes
drop trigger if exists sync_wilson_score on public.uploads;
create trigger sync_wilson_score
  before update of rad_votes, total_votes on public.uploads
  for each row
  execute function public.refresh_wilson_score();

-- ── Recreate get_feed with updated column names ───────────────────────────────
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
  bad_votes   integer,
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
        (rad_count + 1.0) / (rad_count + bad_count + 2.0) as rate
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
        up.rad_votes,
        up.bad_votes,
        usr.username,
        (
          (
            up.wilson_score
            * (1.0 + 3.0 / power(
                extract(epoch from (now() - up.created_at)) / 21600.0 + 1.0,
                1.2
              ))
            * case
                when up.total_votes = 0 then 1.0
                else 1.0 - (cast(up.bad_votes as double precision) / up.total_votes) * 0.3
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
         total_votes, rad_votes, bad_votes, username, feed_score
  from diverse
  where author_rank <= 2
  order by feed_score desc
  limit p_limit;
$$;

grant execute on function public.get_feed(uuid, integer) to authenticated;
