-- Add embed_html column to trends table for TikTok and other platforms
ALTER TABLE public.trends
ADD COLUMN IF NOT EXISTS embed_html TEXT;