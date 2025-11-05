-- Create table to track daily viral replication
CREATE TABLE public.daily_replication_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_video_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'fetched',
  scheduled_time TIMESTAMPTZ,
  video_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_replication_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org's replication log"
ON public.daily_replication_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = daily_replication_log.org_id
  )
);

CREATE POLICY "System can insert replication log"
ON public.daily_replication_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update replication log"
ON public.daily_replication_log
FOR UPDATE
USING (true);

-- Index for faster queries
CREATE INDEX idx_daily_replication_log_org_date ON public.daily_replication_log(org_id, date DESC);
CREATE INDEX idx_daily_replication_log_status ON public.daily_replication_log(status);