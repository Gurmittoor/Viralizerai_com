-- Add script studio columns to video_jobs
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS script_draft TEXT,
ADD COLUMN IF NOT EXISTS cta_custom TEXT,
ADD COLUMN IF NOT EXISTS script_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN DEFAULT false;

-- Add autopilot setting to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.video_jobs.script_draft IS 'AI-generated viral script draft for review';
COMMENT ON COLUMN public.video_jobs.cta_custom IS 'User-editable call-to-action line';
COMMENT ON COLUMN public.video_jobs.script_approved IS 'Must be true before rendering unless autopilot enabled';
COMMENT ON COLUMN public.video_jobs.autopilot_enabled IS 'If true, skip manual review for this job';
COMMENT ON COLUMN public.organizations.autopilot_enabled IS 'If true, auto-approve scripts for this org';