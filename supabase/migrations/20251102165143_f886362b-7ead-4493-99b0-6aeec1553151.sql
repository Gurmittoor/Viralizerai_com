-- Add multi-track content scoring columns to viral_scores
ALTER TABLE public.viral_scores
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS ad_type TEXT,
ADD COLUMN IF NOT EXISTS emotional_depth NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS informational_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS transformation_score NUMERIC DEFAULT 0;

-- Add index for efficient filtering by category and ad_type
CREATE INDEX IF NOT EXISTS idx_viral_scores_category ON public.viral_scores(category);
CREATE INDEX IF NOT EXISTS idx_viral_scores_ad_type ON public.viral_scores(ad_type);

COMMENT ON COLUMN public.viral_scores.category IS 'Content category: short_form, long_form';
COMMENT ON COLUMN public.viral_scores.ad_type IS 'Ad type: ugc, superbowl, educational, motivational, informational';
COMMENT ON COLUMN public.viral_scores.emotional_depth IS 'Emotional resonance score (0-100)';
COMMENT ON COLUMN public.viral_scores.informational_value IS 'Educational/informational value (0-100)';
COMMENT ON COLUMN public.viral_scores.transformation_score IS 'Before/after transformation impact (0-100)';