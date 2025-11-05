-- Update credit allocation to match new pricing model (1¢ = 1 credit)
-- Starter tier: 900 credits = $9

-- Update default values in credits_wallet table
ALTER TABLE public.credits_wallet 
  ALTER COLUMN current_credits SET DEFAULT 900,
  ALTER COLUMN plan_allocation SET DEFAULT 900;

-- Update existing wallets to new allocation (one-time migration)
UPDATE public.credits_wallet 
SET 
  current_credits = GREATEST(current_credits, 900),
  plan_allocation = 900
WHERE plan_allocation = 100;

-- Update the initialize_org_wallet function with new allocation
CREATE OR REPLACE FUNCTION public.initialize_org_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create wallet with starter tier credits (900 = $9)
  INSERT INTO public.credits_wallet (org_id, current_credits, plan_allocation)
  VALUES (NEW.id, 900, 900);
  
  -- Create usage tracking
  INSERT INTO public.org_usage (org_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;