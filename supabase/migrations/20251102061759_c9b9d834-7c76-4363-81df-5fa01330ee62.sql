-- Add emotional scoring columns to viral_scores
ALTER TABLE public.viral_scores
ADD COLUMN IF NOT EXISTS shock_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS warmth_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shareability_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shock_warmth_ratio NUMERIC DEFAULT 0;

-- Add emotional variant tracking to video_jobs
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS emotional_variant_generated BOOLEAN DEFAULT false;