-- Create viral scores table for AI-powered virality analysis
CREATE TABLE IF NOT EXISTS public.viral_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  clone_score NUMERIC NOT NULL DEFAULT 0,
  virality_score NUMERIC NOT NULL DEFAULT 0,
  product_fit_score NUMERIC NOT NULL DEFAULT 0,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  ai_reasoning TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trend_id)
);

-- Add adapted_script column to video_jobs for AI-generated brand adaptations
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS adapted_script TEXT,
ADD COLUMN IF NOT EXISTS virality_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS adaptation_notes TEXT;

-- Enable RLS on viral_scores
ALTER TABLE public.viral_scores ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read viral scores
CREATE POLICY "Authenticated users can view viral scores"
ON public.viral_scores
FOR SELECT
TO authenticated
USING (true);

-- System can insert/update viral scores
CREATE POLICY "System can manage viral scores"
ON public.viral_scores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_viral_scores_trend_id ON public.viral_scores(trend_id);
CREATE INDEX IF NOT EXISTS idx_viral_scores_overall_score ON public.viral_scores(overall_score DESC);