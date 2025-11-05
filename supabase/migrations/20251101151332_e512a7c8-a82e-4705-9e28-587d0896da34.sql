-- Add memory allocation columns to organizations
ALTER TABLE public.organizations
ADD COLUMN memory_allocation_mb NUMERIC DEFAULT 500,
ADD COLUMN memory_used_mb NUMERIC DEFAULT 0,
ADD COLUMN auto_purge_old BOOLEAN DEFAULT false;

-- Create org_usage table for tracking consumption
CREATE TABLE public.org_usage (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_storage_mb NUMERIC DEFAULT 0,
  total_memory_tokens NUMERIC DEFAULT 0,
  total_videos_generated INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_usage ENABLE ROW LEVEL SECURITY;

-- Create credits_wallet table for credit balance
CREATE TABLE public.credits_wallet (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_credits NUMERIC DEFAULT 100,
  credits_used NUMERIC DEFAULT 0,
  plan_allocation NUMERIC DEFAULT 100,
  last_topup TIMESTAMPTZ DEFAULT now(),
  next_reset TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month'),
  stripe_customer_id TEXT
);

ALTER TABLE public.credits_wallet ENABLE ROW LEVEL SECURITY;

-- Create usage_events table for transaction log
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  credits_cost NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_usage
CREATE POLICY "Users can view their org's usage"
ON public.org_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = org_usage.org_id
  )
);

-- RLS Policies for credits_wallet
CREATE POLICY "Users can view their org's wallet"
ON public.credits_wallet FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = credits_wallet.org_id
  )
);

CREATE POLICY "Users can update their org's wallet"
ON public.credits_wallet FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = credits_wallet.org_id
  )
);

-- RLS Policies for usage_events
CREATE POLICY "Users can view their org's usage events"
ON public.usage_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.org_id = usage_events.org_id
  )
);

-- Function to initialize wallet for new organizations
CREATE OR REPLACE FUNCTION public.initialize_org_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create wallet with starter credits
  INSERT INTO public.credits_wallet (org_id, current_credits, plan_allocation)
  VALUES (NEW.id, 100, 100);
  
  -- Create usage tracking
  INSERT INTO public.org_usage (org_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger to initialize wallet on org creation
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.initialize_org_wallet();

-- Function to charge credits
CREATE OR REPLACE FUNCTION public.charge_credits(
  _org_id UUID,
  _feature TEXT,
  _cost NUMERIC,
  _description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_credits NUMERIC;
BEGIN
  -- Get current credits
  SELECT current_credits INTO _current_credits
  FROM public.credits_wallet
  WHERE org_id = _org_id
  FOR UPDATE;
  
  -- Check if sufficient credits
  IF _current_credits < _cost THEN
    RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', _current_credits, _cost;
  END IF;
  
  -- Deduct credits
  UPDATE public.credits_wallet
  SET 
    current_credits = current_credits - _cost,
    credits_used = credits_used + _cost
  WHERE org_id = _org_id;
  
  -- Log the transaction
  INSERT INTO public.usage_events (org_id, feature, credits_cost, description)
  VALUES (_org_id, _feature, _cost, COALESCE(_description, 'Used ' || _cost || ' credits for ' || _feature));
  
  RETURN TRUE;
END;
$$;

-- Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION public.add_credits(
  _org_id UUID,
  _amount NUMERIC,
  _description TEXT DEFAULT 'Credit purchase'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add credits
  UPDATE public.credits_wallet
  SET 
    current_credits = current_credits + _amount,
    last_topup = now()
  WHERE org_id = _org_id;
  
  -- Log the transaction
  INSERT INTO public.usage_events (org_id, feature, credits_cost, description)
  VALUES (_org_id, 'credit_purchase', -_amount, _description);
  
  RETURN TRUE;
END;
$$;