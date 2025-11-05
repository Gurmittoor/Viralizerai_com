-- Add Super Bowl tone variant columns to video_jobs
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS super_tone TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS super_variant_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cinematic_structure JSONB;