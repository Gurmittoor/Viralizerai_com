-- Create platform_virality_profiles table
CREATE TABLE public.platform_virality_profiles (
  platform TEXT PRIMARY KEY CHECK (platform IN ('tiktok','youtube_shorts','instagram_reels','facebook_reels')),
  hook_window_seconds INTEGER DEFAULT 2,
  ideal_length_seconds INTEGER DEFAULT 45,
  hashtag_strategy JSONB,
  caption_style TEXT,
  visual_rules JSONB,
  audio_rules JSONB,
  engagement_triggers JSONB,
  update_frequency_days INTEGER DEFAULT 7,
  last_synced TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_virality_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read virality profiles to all authenticated"
ON public.platform_virality_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admin can modify virality profiles"
ON public.platform_virality_profiles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Seed initial defaults
INSERT INTO public.platform_virality_profiles (
  platform,
  hook_window_seconds,
  ideal_length_seconds,
  hashtag_strategy,
  caption_style,
  visual_rules,
  audio_rules,
  engagement_triggers
) VALUES
('tiktok', 2, 38,
 '{"max":5,"mix":"viral+local+niche"}',
 'comment_bait',
 '{"ratio":"9:16","requires_subtitles":true,"looping":true}',
 '{"use_trending_sound":true,"allow_music":true}',
 '{"cta_type":"comment","emotion_curve":"panic_to_relief"}'
),
('youtube_shorts', 3, 52,
 '{"max":2,"mix":"keyword+brand"}',
 'keyword_dense',
 '{"ratio":"9:16","requires_subtitles":true,"looping":false}',
 '{"use_trending_sound":false,"allow_music":true}',
 '{"cta_type":"watch_to_end","emotion_curve":"curiosity_to_payoff"}'
),
('instagram_reels', 2, 40,
 '{"max":8,"mix":"trending+vanity+local"}',
 'story_tease',
 '{"ratio":"9:16","requires_subtitles":true,"looping":true}',
 '{"use_trending_sound":true,"allow_music":true}',
 '{"cta_type":"dm_us","emotion_curve":"aspiration_relief"}'
),
('facebook_reels', 4, 55,
 '{"max":5,"mix":"problem+solution"}',
 'direct_offer',
 '{"ratio":"9:16","requires_subtitles":true,"looping":false}',
 '{"use_trending_sound":false,"allow_music":true}',
 '{"cta_type":"call_now","emotion_curve":"stress_fix_trust"}'
);

-- Create platform_variants table
CREATE TABLE public.platform_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_job_id UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok','youtube_shorts','instagram_reels','facebook_reels')),
  variant_status TEXT CHECK (variant_status IN ('queued','rendering','rendered','failed','posted')) DEFAULT 'queued',
  variant_url TEXT,
  hashtags TEXT[],
  caption TEXT,
  thumbnail_url TEXT,
  engagement_prediction NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org can view their platform_variants"
ON public.platform_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.video_jobs vj
    JOIN public.users u ON u.org_id = vj.org_id
    WHERE vj.id = platform_variants.video_job_id
      AND u.id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

CREATE POLICY "Org can insert/update their platform_variants"
ON public.platform_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.video_jobs vj
    JOIN public.users u ON u.org_id = vj.org_id
    WHERE vj.id = platform_variants.video_job_id
      AND u.id = auth.uid()
  ) OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.video_jobs vj
    JOIN public.users u ON u.org_id = vj.org_id
    WHERE vj.id = platform_variants.video_job_id
      AND u.id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

-- Update publish_queue table
ALTER TABLE public.publish_queue
ADD COLUMN IF NOT EXISTS platform_specific_variant_id UUID REFERENCES public.platform_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS caption TEXT;

-- Create charge_platform_variant function
CREATE OR REPLACE FUNCTION public.charge_platform_variant(
  _org_id UUID,
  _video_job_id UUID,
  _platform TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _COST NUMERIC := 10;
BEGIN
  PERFORM public.charge_credits(
    _org_id,
    'platform_variant_' || _platform,
    _COST,
    'Platform-optimized variant for ' || _platform || ' on video ' || _video_job_id
  );
  RETURN TRUE;
END;
$$;