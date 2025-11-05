-- Create replication_history table with unique source_video_url to prevent duplicates
CREATE TABLE IF NOT EXISTS public.replication_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_video_url text UNIQUE NOT NULL,
  platform text CHECK (platform IN ('youtube','tiktok','instagram','facebook')),
  remake_job_id uuid REFERENCES public.video_jobs(id) ON DELETE SET NULL,
  processed_at timestamptz DEFAULT now(),
  scheduled_time timestamptz,
  status text CHECK (status IN ('fetched','remade','scheduled','duplicate_skipped')) DEFAULT 'fetched',
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_replication_history_source_url ON public.replication_history(source_video_url);
CREATE INDEX IF NOT EXISTS idx_replication_history_org_id ON public.replication_history(org_id);

-- Enable RLS
ALTER TABLE public.replication_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org's replication history"
  ON public.replication_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.org_id = replication_history.org_id
    )
  );

CREATE POLICY "System can insert replication history"
  ON public.replication_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update replication history"
  ON public.replication_history
  FOR UPDATE
  USING (true);