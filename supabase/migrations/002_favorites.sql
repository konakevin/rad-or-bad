-- =============================================
-- Favorites
-- =============================================
create table public.favorites (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.users(id) on delete cascade not null,
  upload_id  uuid references public.uploads(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, upload_id)
);

create index favorites_user_id_idx on public.favorites(user_id);

alter table public.favorites enable row level security;

create policy "Users can view own favorites"
  on public.favorites for select using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.favorites for insert with check (auth.uid() = user_id);

create policy "Users can remove favorites"
  on public.favorites for delete using (auth.uid() = user_id);
