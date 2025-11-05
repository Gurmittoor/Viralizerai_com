-- Add knowledge base URLs field to organizations table
ALTER TABLE public.organizations
ADD COLUMN knowledge_base_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.organizations.knowledge_base_urls IS 'Array of website URLs (own site, blog, competitor sites) to use as knowledge base for video generation';