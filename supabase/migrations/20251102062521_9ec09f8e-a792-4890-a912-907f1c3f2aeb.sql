-- Add variant testing columns to video_jobs
ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS variant_group_id UUID,
ADD COLUMN IF NOT EXISTS early_ctr NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_watch_time NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS selected_variant BOOLEAN DEFAULT false;

-- Create function to auto-select best performing variant
CREATE OR REPLACE FUNCTION public.auto_select_best_variant()
RETURNS void AS $$
DECLARE
  variant_group RECORD;
  best_variant_id UUID;
BEGIN
  -- Loop through each variant group
  FOR variant_group IN 
    SELECT DISTINCT variant_group_id 
    FROM public.video_jobs 
    WHERE variant_group_id IS NOT NULL 
    AND status = 'rendered'
    AND selected_variant = FALSE
  LOOP
    -- Find the best variant in this group based on performance
    SELECT id INTO best_variant_id
    FROM public.video_jobs
    WHERE variant_group_id = variant_group.variant_group_id
    ORDER BY (early_ctr * 0.6 + early_watch_time * 0.4) DESC
    LIMIT 1;
    
    -- Mark it as selected
    IF best_variant_id IS NOT NULL THEN
      UPDATE public.video_jobs
      SET selected_variant = TRUE,
          status = 'ready_for_posting'
      WHERE id = best_variant_id;
      
      -- Mark others as not selected
      UPDATE public.video_jobs
      SET selected_variant = FALSE
      WHERE variant_group_id = variant_group.variant_group_id
      AND id != best_variant_id;
      
      -- Log the selection
      RAISE NOTICE 'Selected variant % for group %', best_variant_id, variant_group.variant_group_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;