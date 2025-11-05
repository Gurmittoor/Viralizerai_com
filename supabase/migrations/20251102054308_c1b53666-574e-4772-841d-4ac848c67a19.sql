-- Add clone readiness scoring to trends table
ALTER TABLE public.trends
ADD COLUMN IF NOT EXISTS clone_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clone_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spoken_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT 'unknown';

-- Create table for related trending videos
CREATE TABLE IF NOT EXISTS public.related_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  related_video_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  reason TEXT,
  similarity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(video_id, related_video_id)
);

-- Enable RLS on related_trends
ALTER TABLE public.related_trends ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read related trends
CREATE POLICY "Authenticated users can view related trends"
ON public.related_trends
FOR SELECT
TO authenticated
USING (true);

-- System can insert/update related trends
CREATE POLICY "System can manage related trends"
ON public.related_trends
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trends_clone_ready ON public.trends(clone_ready, views DESC);
CREATE INDEX IF NOT EXISTS idx_related_trends_video_id ON public.related_trends(video_id);