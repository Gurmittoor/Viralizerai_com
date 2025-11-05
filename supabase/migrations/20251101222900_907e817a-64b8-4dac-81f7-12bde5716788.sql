-- Add missing column to trends table
ALTER TABLE public.trends
ADD COLUMN IF NOT EXISTS brand_notes TEXT;

-- Create trending categories table
CREATE TABLE IF NOT EXISTS public.trending_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on trending_categories
ALTER TABLE public.trending_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read categories
CREATE POLICY "Allow read to all authenticated"
ON public.trending_categories FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert categories
CREATE POLICY "Allow insert to all authenticated"
ON public.trending_categories FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert default categories
INSERT INTO public.trending_categories (name) VALUES
  ('Real Estate'),
  ('Legal'),
  ('Finance'),
  ('Healthcare'),
  ('Technology'),
  ('E-commerce'),
  ('Education'),
  ('Entertainment')
ON CONFLICT (name) DO NOTHING;