-- Migration 056: Add dream_wish column for user's next dream subject
ALTER TABLE public.user_recipes ADD COLUMN IF NOT EXISTS dream_wish text DEFAULT NULL;
