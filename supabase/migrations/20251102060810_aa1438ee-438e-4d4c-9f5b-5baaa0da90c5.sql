-- Add performance tracking and reference library tables

-- Table to store AI Agents 247's proven ad reference library
CREATE TABLE IF NOT EXISTS public.reference_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  video_url TEXT NOT NULL,
  script TEXT,
  tone_profile TEXT DEFAULT 'professional', -- humorous, emotional, professional
  performance_score NUMERIC DEFAULT 0, -- 0-100 based on actual performance
  structural_pattern JSONB, -- stores ad DNA: setup, hook, benefit, cta structure
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add performance tracking columns to video_jobs
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS actual_views BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_ctr NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_watch_time_seconds NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tone_variant TEXT DEFAULT 'professional', -- humorous, emotional, professional
ADD COLUMN IF NOT EXISTS dna_match_score NUMERIC DEFAULT 0; -- how well it matches reference library

-- Add commercial DNA scoring to viral_scores
ALTER TABLE public.viral_scores
ADD COLUMN IF NOT EXISTS commercial_dna_score NUMERIC DEFAULT 0, -- UGC/testimonial style fit
ADD COLUMN IF NOT EXISTS replication_feasibility NUMERIC DEFAULT 0, -- how easy to replicate
ADD COLUMN IF NOT EXISTS tone_recommendations JSONB; -- suggested tones with scores

-- Create RLS policies
ALTER TABLE public.reference_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org's reference ads"
ON public.reference_ads
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.org_id = reference_ads.org_id
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reference_ads_org ON public.reference_ads(org_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_performance ON public.video_jobs(performance_score DESC) WHERE performance_score > 0;