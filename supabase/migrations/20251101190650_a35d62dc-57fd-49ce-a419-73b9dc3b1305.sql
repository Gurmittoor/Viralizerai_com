-- Add index for script studio queries
CREATE INDEX IF NOT EXISTS video_jobs_script_status_idx
ON public.video_jobs (org_id, script_approved, status);

-- Update video_jobs to add autopilot_snapshot if not exists
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS autopilot_snapshot BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.video_jobs.autopilot_snapshot IS 'Whether this job was created while org had autopilot enabled';