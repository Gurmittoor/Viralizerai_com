-- Add platform_optimize column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS platform_optimize BOOLEAN DEFAULT true;