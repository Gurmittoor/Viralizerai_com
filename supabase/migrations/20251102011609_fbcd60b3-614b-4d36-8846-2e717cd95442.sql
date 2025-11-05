-- Add unique constraint on source_video_url to support upsert
ALTER TABLE public.trends 
ADD CONSTRAINT trends_source_video_url_unique UNIQUE (source_video_url);