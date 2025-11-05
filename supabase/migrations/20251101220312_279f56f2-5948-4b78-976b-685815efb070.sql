-- Enhance trends table for viral video display
ALTER TABLE trends 
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS hook_text text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);
CREATE INDEX IF NOT EXISTS idx_trends_engagement ON trends(engagement_score DESC);

-- Add some sample data for testing (you can delete this later)
INSERT INTO trends (platform, title, source_video_url, category, hook_text, views, likes, engagement_score, transcript)
VALUES 
  ('tiktok', 'Real Estate Agent Goes Viral with Property Tour', 'https://www.tiktok.com/@example/video/123', 'real_estate', 'You won''t believe what this $2M house has inside...', 1500000, 85000, 95.5, 'Full transcript here...'),
  ('youtube', 'Lawyer Explains Your Rights in 60 Seconds', 'https://youtube.com/shorts/abc123', 'legal', 'If a cop says this, do NOT answer...', 2300000, 120000, 98.2, 'Transcript content...')
ON CONFLICT DO NOTHING;