-- Add active_platforms array to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS active_platforms TEXT[] DEFAULT '{}';

-- Set default active platforms for existing organizations
UPDATE public.organizations
SET active_platforms = ARRAY['instagram', 'youtube', 'facebook']
WHERE active_platforms IS NULL OR active_platforms = '{}';