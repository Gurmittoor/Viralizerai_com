-- Add knowledge base URLs field to brands table
ALTER TABLE public.brands
ADD COLUMN knowledge_base_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.brands.knowledge_base_urls IS 'Array of website URLs (own site, blog, competitor sites) to use as knowledge base for video generation';
