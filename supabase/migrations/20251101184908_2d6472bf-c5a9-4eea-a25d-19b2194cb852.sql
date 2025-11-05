-- Add manual review flag for regulated verticals
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS requires_manual_review_before_post BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.organizations.requires_manual_review_before_post IS 
'When true, videos go to pending_review status instead of pending. Protects against auto-posting in regulated industries (legal, medical, financial).';