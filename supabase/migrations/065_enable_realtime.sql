-- Migration 063: Enable Supabase Realtime on tables needed for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uploads;
