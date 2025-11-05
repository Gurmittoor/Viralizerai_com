-- Add ranking columns to viral_scores
ALTER TABLE public.viral_scores
ADD COLUMN IF NOT EXISTS engagement_velocity NUMERIC,
ADD COLUMN IF NOT EXISTS clone_match_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS viral_rank INTEGER;

-- Create view for ranked predictions
CREATE OR REPLACE VIEW public.viral_ranking AS
SELECT
  t.id AS trend_id,
  t.title,
  t.platform,
  t.views,
  t.is_ad,
  v.clone_score,
  v.virality_score,
  v.product_fit_score,
  v.clone_match_percent,
  v.overall_score,
  (v.overall_score * 0.6 + COALESCE(v.clone_match_percent, 0) * 0.4) AS final_score,
  RANK() OVER (ORDER BY (v.overall_score * 0.6 + COALESCE(v.clone_match_percent, 0) * 0.4) DESC) AS viral_rank
FROM public.trends t
JOIN public.viral_scores v ON v.trend_id = t.id
WHERE v.calculated_at > now() - interval '24 hours'
ORDER BY viral_rank ASC;

-- Grant access to the view
GRANT SELECT ON public.viral_ranking TO authenticated;