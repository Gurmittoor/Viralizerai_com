-- ============================================
-- MULTI-VERTICAL + MARKET BRAIN MIGRATION
-- ============================================

-- 1. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _user_id AND role = 'admin'
  );
$$;

-- 2. Update video_jobs for multi-vertical support
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS target_vertical TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS brand_label TEXT,
ADD COLUMN IF NOT EXISTS insight_id UUID;

COMMENT ON COLUMN public.video_jobs.target_vertical IS 'Which industry/vertical this video targets (e.g., plumbers, lawyers, hvac)';
COMMENT ON COLUMN public.video_jobs.storage_path IS 'Full storage path in Supabase storage where final video is stored';
COMMENT ON COLUMN public.video_jobs.brand_label IS 'Brand domain to use for CTA (e.g., AIAgents247.ca, AIRealtors247.ca)';
COMMENT ON COLUMN public.video_jobs.insight_id IS 'Reference to market insights used to generate this video';

CREATE INDEX IF NOT EXISTS video_jobs_org_vertical_idx ON public.video_jobs (org_id, target_vertical);
CREATE INDEX IF NOT EXISTS video_jobs_status_vertical_idx ON public.video_jobs (status, target_vertical);

-- 3. Update publish_queue for multi-vertical support
ALTER TABLE public.publish_queue
ADD COLUMN IF NOT EXISTS target_vertical TEXT,
ADD COLUMN IF NOT EXISTS brand_label TEXT;

COMMENT ON COLUMN public.publish_queue.target_vertical IS 'Industry vertical for proper account routing';
COMMENT ON COLUMN public.publish_queue.brand_label IS 'Brand domain for this post';

-- 4. Create org_sources table (Market Brain)
CREATE TABLE IF NOT EXISTS public.org_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  type TEXT CHECK (type IN ('self', 'competitor', 'blog', 'landing_page')) DEFAULT 'self',
  active BOOLEAN DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  crawl_status TEXT CHECK (crawl_status IN ('pending','ok','error')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, url)
);

ALTER TABLE public.org_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org can manage their sources"
ON public.org_sources
FOR ALL
USING (
  org_id = public.get_user_org_id(auth.uid()) OR 
  public.is_admin(auth.uid())
)
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid()) OR 
  public.is_admin(auth.uid())
);

-- 5. Create org_market_insights table (Market Brain)
CREATE TABLE IF NOT EXISTS public.org_market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.org_sources(id) ON DELETE CASCADE,
  niche_vertical TEXT,
  headline_offers TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  objections TEXT[] DEFAULT '{}',
  proof_points TEXT[] DEFAULT '{}',
  brand_voice_notes TEXT,
  competitor_angle TEXT,
  last_generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_market_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org can manage their insights"
ON public.org_market_insights
FOR ALL
USING (
  org_id = public.get_user_org_id(auth.uid()) OR 
  public.is_admin(auth.uid())
)
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid()) OR 
  public.is_admin(auth.uid())
);

CREATE INDEX IF NOT EXISTS org_market_insights_org_vertical_idx 
ON public.org_market_insights (org_id, niche_vertical);

-- 6. Add foreign key for insight_id in video_jobs
ALTER TABLE public.video_jobs
ADD CONSTRAINT fk_video_jobs_insight
FOREIGN KEY (insight_id) REFERENCES public.org_market_insights(id) ON DELETE SET NULL;

-- 7. Create storage bucket for videos (if not exists via function call)
-- This will be handled by edge function on first use