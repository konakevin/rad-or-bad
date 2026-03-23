-- =============================================
-- Dope or Nope — Initial Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- USERS
-- =============================================
create table public.users (
  id                   uuid references auth.users(id) on delete cascade primary key,
  email                text unique not null,
  username             text unique not null,
  avatar_url           text,
  created_at           timestamptz default now() not null,
  critic_level         integer default 1 not null check (critic_level between 1 and 6),
  total_ratings_given  integer default 0 not null,
  pro_subscription     boolean default false not null,
  subscription_expires timestamptz,
  skip_tokens          integer default 1 not null,
  upload_count_week    integer default 0 not null,
  week_reset_date      date default current_date not null
);

-- =============================================
-- UPLOADS
-- =============================================
create type public.category as enum (
  'people', 'animals', 'food', 'nature', 'memes'
);

create table public.uploads (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.users(id) on delete cascade not null,
  category       public.category not null,
  image_url      text not null,
  caption        text check (char_length(caption) <= 200),
  created_at     timestamptz default now() not null,
  total_votes    integer default 0 not null,
  gas_votes      integer default 0 not null,
  pass_votes     integer default 0 not null,
  is_moderated   boolean default false not null,
  is_approved    boolean,
  is_active      boolean default true not null
);

-- Computed hotness score as a view for querying
create view public.uploads_with_score as
  select
    *,
    case
      when total_votes = 0 then null
      else round((gas_votes::decimal / total_votes) * 100, 1)
    end as hotness_score
  from public.uploads
  where is_active = true and (is_approved = true or is_approved is null);

-- =============================================
-- VOTES
-- =============================================
create type public.vote_type as enum ('gas', 'pass', 'skip');

create table public.votes (
  id         uuid default uuid_generate_v4() primary key,
  voter_id   uuid references public.users(id) on delete cascade not null,
  upload_id  uuid references public.uploads(id) on delete cascade not null,
  vote       public.vote_type not null,
  created_at timestamptz default now() not null,
  unique (voter_id, upload_id)
);

-- =============================================
-- ACHIEVEMENTS
-- =============================================
create table public.achievements (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references public.users(id) on delete cascade not null,
  achievement_type text not null,
  unlocked_at      timestamptz default now() not null,
  unique (user_id, achievement_type)
);

-- =============================================
-- REPORTS
-- =============================================
create table public.reports (
  id          uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.users(id) on delete cascade not null,
  upload_id   uuid references public.uploads(id) on delete cascade not null,
  reason      text not null,
  created_at  timestamptz default now() not null,
  resolved    boolean default false not null
);

-- =============================================
-- INDEXES
-- =============================================
create index uploads_user_id_idx on public.uploads(user_id);
create index uploads_category_idx on public.uploads(category);
create index uploads_created_at_idx on public.uploads(created_at desc);
create index votes_voter_id_idx on public.votes(voter_id);
create index votes_upload_id_idx on public.votes(upload_id);

-- =============================================
-- AUTO-UPDATE VOTE COUNTS
-- =============================================
create or replace function public.handle_new_vote()
returns trigger as $$
begin
  if new.vote = 'gas' then
    update public.uploads
    set total_votes = total_votes + 1, gas_votes = gas_votes + 1
    where id = new.upload_id;
  elsif new.vote = 'pass' then
    update public.uploads
    set total_votes = total_votes + 1, pass_votes = pass_votes + 1
    where id = new.upload_id;
  end if;

  -- Update critic level for voter
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

create trigger on_vote_inserted
  after insert on public.votes
  for each row execute procedure public.handle_new_vote();

-- =============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.users enable row level security;
alter table public.uploads enable row level security;
alter table public.votes enable row level security;
alter table public.achievements enable row level security;
alter table public.reports enable row level security;

-- Users: anyone can read profiles, only you can update yours
create policy "Public profiles are viewable by everyone"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Uploads: approved uploads are public, owners manage their own
create policy "Approved uploads are viewable by everyone"
  on public.uploads for select using (is_active = true);

create policy "Users can insert their own uploads"
  on public.uploads for insert with check (auth.uid() = user_id);

create policy "Users can delete their own uploads"
  on public.uploads for delete using (auth.uid() = user_id);

-- Votes: users can see their own votes, insert once per upload
create policy "Users can view own votes"
  on public.votes for select using (auth.uid() = voter_id);

create policy "Authenticated users can vote"
  on public.votes for insert with check (auth.uid() = voter_id);

-- Achievements: public read, system write only
create policy "Achievements are viewable by everyone"
  on public.achievements for select using (true);

-- Reports: users can create, only see their own
create policy "Users can create reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on public.reports for select using (auth.uid() = reporter_id);
