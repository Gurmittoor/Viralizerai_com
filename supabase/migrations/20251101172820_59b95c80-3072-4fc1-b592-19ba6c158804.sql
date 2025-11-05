-- Add product_service column to brands table
ALTER TABLE public.brands 
ADD COLUMN product_service text;

-- Add a comment explaining the column
COMMENT ON COLUMN public.brands.product_service IS 'The specific AI service/product this brand represents (e.g., ai_receptionist, ai_cold_calling, etc.)';