-- =============================================
-- Follows
-- =============================================
create table public.follows (
  id           uuid default uuid_generate_v4() primary key,
  follower_id  uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at   timestamptz default now() not null,
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

create index follows_follower_id_idx  on public.follows(follower_id);
create index follows_following_id_idx on public.follows(following_id);

alter table public.follows enable row level security;

-- Anyone can see who follows whom (needed for counts on public profiles)
create policy "Follows are publicly viewable"
  on public.follows for select using (true);

create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);
