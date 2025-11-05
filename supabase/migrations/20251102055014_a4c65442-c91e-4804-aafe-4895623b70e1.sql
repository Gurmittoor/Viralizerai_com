-- Add is_ad column to trends table
ALTER TABLE public.trends
ADD COLUMN IF NOT EXISTS is_ad BOOLEAN DEFAULT false;