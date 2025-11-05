-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_tier TEXT DEFAULT 'starter',
  auto_generate_daily BOOLEAN DEFAULT false,
  auto_post_daily BOOLEAN DEFAULT false,
  default_post_time TIMESTAMPTZ,
  industry TEXT,
  service_area TEXT,
  offer TEXT,
  cta_voice_line TEXT DEFAULT 'Try A-I Agents two-four-seven dot C-A',
  brand_domain TEXT DEFAULT 'AIAgents247.ca',
  allow_captions BOOLEAN DEFAULT false,
  forbidden_claims TEXT[] DEFAULT '{}',
  tone_profile TEXT DEFAULT 'professional',
  target_verticals TEXT[] DEFAULT '{}',
  product_focus TEXT[] DEFAULT '{}',
  allow_external_clients BOOLEAN DEFAULT true,
  allow_internal_brands BOOLEAN DEFAULT true,
  legal_content_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create brands table for multi-brand management
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand_domain TEXT,
  tone_profile TEXT DEFAULT 'professional',
  cta_voice_line TEXT DEFAULT 'Try A-I Agents two-four-seven dot C-A',
  allow_captions BOOLEAN DEFAULT false,
  forbidden_claims TEXT[] DEFAULT '{}',
  target_platforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create video_jobs table
CREATE TABLE public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued',
  trend_id UUID,
  scene_prompts JSONB,
  veo_urls TEXT[] DEFAULT '{}',
  merged_url TEXT,
  final_url TEXT,
  transcript TEXT,
  post_targets TEXT[] DEFAULT '{}',
  posted_metadata JSONB DEFAULT '{}',
  compliance_status TEXT DEFAULT 'unchecked',
  compliance_report JSONB,
  campaign_type TEXT DEFAULT 'brand_awareness' CHECK (campaign_type IN ('brand_awareness','product_launch','client_service','testimonial','explainer','legal_notice')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

-- Create publish_queue table
CREATE TABLE public.publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  video_job_id UUID REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  final_url TEXT,
  platform TEXT,
  scheduled_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  platform_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.publish_queue ENABLE ROW LEVEL SECURITY;

-- Create trends table
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,
  source_video_url TEXT,
  title TEXT,
  transcript TEXT,
  hashtags TEXT[] DEFAULT '{}',
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  engagement_score NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT now(),
  viral_notes TEXT
);

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- Create viral_frameworks table
CREATE TABLE public.viral_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,
  title TEXT,
  summary TEXT,
  key_traits JSONB,
  script_template TEXT,
  freshness_score NUMERIC,
  derived_from_trend_id UUID REFERENCES public.trends(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.viral_frameworks ENABLE ROW LEVEL SECURITY;

-- Create org_trend_history table
CREATE TABLE public.org_trend_history (
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  framework_id UUID REFERENCES public.viral_frameworks(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT now(),
  performance_score NUMERIC,
  PRIMARY KEY (org_id, framework_id, used_at)
);

ALTER TABLE public.org_trend_history ENABLE ROW LEVEL SECURITY;

-- Create policies table
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_or_platform TEXT,
  category TEXT,
  rule_text TEXT,
  json_schema JSONB,
  effective_date TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  applies_to_product_focus TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Create policy_changes table
CREATE TABLE public.policy_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  change_date TIMESTAMPTZ DEFAULT now(),
  change_description TEXT,
  diff_notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.policy_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = organizations.id
  )
);

CREATE POLICY "Users can update their own organization"
ON public.organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = organizations.id
  )
);

-- RLS Policies for users
CREATE POLICY "Users can view themselves"
ON public.users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update themselves"
ON public.users FOR UPDATE
USING (id = auth.uid());

-- RLS Policies for brands
CREATE POLICY "Users can view their org's brands"
ON public.brands FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = brands.org_id
  )
);

CREATE POLICY "Users can insert brands for their org"
ON public.brands FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = brands.org_id
  )
);

CREATE POLICY "Users can update their org's brands"
ON public.brands FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = brands.org_id
  )
);

CREATE POLICY "Users can delete their org's brands"
ON public.brands FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = brands.org_id
  )
);

-- RLS Policies for video_jobs
CREATE POLICY "Users can view their org's video jobs"
ON public.video_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = video_jobs.org_id
  )
);

CREATE POLICY "Users can insert video jobs for their org"
ON public.video_jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = video_jobs.org_id
  )
);

CREATE POLICY "Users can update their org's video jobs"
ON public.video_jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = video_jobs.org_id
  )
);

CREATE POLICY "Users can delete their org's video jobs"
ON public.video_jobs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = video_jobs.org_id
  )
);

-- RLS Policies for publish_queue
CREATE POLICY "Users can view their org's publish queue"
ON public.publish_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = publish_queue.org_id
  )
);

CREATE POLICY "Users can manage their org's publish queue"
ON public.publish_queue FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = publish_queue.org_id
  )
);

-- RLS Policies for org_trend_history
CREATE POLICY "Users can view their org's trend history"
ON public.org_trend_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = org_trend_history.org_id
  )
);

-- RLS Policies for viral_frameworks (public read)
CREATE POLICY "Authenticated users can view viral frameworks"
ON public.viral_frameworks FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for trends (admin only)
CREATE POLICY "Trends are viewable by authenticated users"
ON public.trends FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for policies (public read)
CREATE POLICY "Policies are viewable by authenticated users"
ON public.policies FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for policy_changes (admin only for now)
CREATE POLICY "Policy changes are viewable by authenticated users"
ON public.policy_changes FOR SELECT
TO authenticated
USING (true);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization for new user
  INSERT INTO public.organizations (name, plan_tier)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'), 'starter')
  RETURNING id INTO new_org_id;
  
  -- Create user profile
  INSERT INTO public.users (id, org_id, email, role)
  VALUES (NEW.id, new_org_id, NEW.email, 'owner');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();