-- Add source video tracking to prevent duplicates

-- Add columns to video_jobs table for source tracking
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS source_video_url TEXT,
ADD COLUMN IF NOT EXISTS source_video_id TEXT,
ADD COLUMN IF NOT EXISTS source_platform TEXT,
ADD COLUMN IF NOT EXISTS source_title TEXT,
ADD COLUMN IF NOT EXISTS cloned_at TIMESTAMPTZ;

-- Create index for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_video_jobs_source_url 
ON public.video_jobs(source_video_url) 
WHERE source_video_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_jobs_source_id 
ON public.video_jobs(source_video_id, source_platform) 
WHERE source_video_id IS NOT NULL;

-- Create a dedicated table for source video tracking
CREATE TABLE IF NOT EXISTS public.cloned_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    source_video_id TEXT,
    source_platform TEXT NOT NULL,
    source_title TEXT,
    source_author TEXT,
    source_views BIGINT,
    source_engagement_score NUMERIC,
    
    first_cloned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clone_count INTEGER DEFAULT 1,
    
    video_job_id UUID REFERENCES public.video_jobs(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_source_per_org UNIQUE(source_url, org_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cloned_sources_org 
ON public.cloned_sources(org_id);

CREATE INDEX IF NOT EXISTS idx_cloned_sources_platform 
ON public.cloned_sources(source_platform);

CREATE INDEX IF NOT EXISTS idx_cloned_sources_url 
ON public.cloned_sources(source_url);

-- RLS policies
ALTER TABLE public.cloned_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org cloned sources"
ON public.cloned_sources
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.org_id = cloned_sources.org_id
));

CREATE POLICY "Users can insert org cloned sources"
ON public.cloned_sources
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.org_id = cloned_sources.org_id
));

CREATE POLICY "Users can update org cloned sources"
ON public.cloned_sources
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.org_id = cloned_sources.org_id
));

-- Helper function: Check if source already cloned
CREATE OR REPLACE FUNCTION public.is_source_cloned(
    p_source_url TEXT,
    p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.cloned_sources 
        WHERE source_url = p_source_url 
        AND org_id = p_org_id
    );
END;
$$;

-- Helper function: Mark source as cloned
CREATE OR REPLACE FUNCTION public.mark_source_cloned(
    p_source_url TEXT,
    p_source_video_id TEXT,
    p_source_platform TEXT,
    p_org_id UUID,
    p_video_job_id UUID,
    p_source_title TEXT DEFAULT NULL,
    p_source_author TEXT DEFAULT NULL,
    p_source_views BIGINT DEFAULT NULL,
    p_source_engagement_score NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cloned_source_id UUID;
BEGIN
    INSERT INTO public.cloned_sources (
        source_url,
        source_video_id,
        source_platform,
        source_title,
        source_author,
        source_views,
        source_engagement_score,
        org_id,
        video_job_id,
        first_cloned_at,
        last_checked_at,
        clone_count
    )
    VALUES (
        p_source_url,
        p_source_video_id,
        p_source_platform,
        p_source_title,
        p_source_author,
        p_source_views,
        p_source_engagement_score,
        p_org_id,
        p_video_job_id,
        NOW(),
        NOW(),
        1
    )
    ON CONFLICT (source_url, org_id) 
    DO UPDATE SET
        last_checked_at = NOW(),
        clone_count = public.cloned_sources.clone_count + 1,
        video_job_id = p_video_job_id
    RETURNING id INTO v_cloned_source_id;
    
    RETURN v_cloned_source_id;
END;
$$;