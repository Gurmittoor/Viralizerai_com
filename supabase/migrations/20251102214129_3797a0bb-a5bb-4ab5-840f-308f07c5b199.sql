-- Add helper function for filtering uncloned sources
CREATE OR REPLACE FUNCTION public.filter_uncloned_sources(
    p_source_urls TEXT[],
    p_org_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_uncloned_urls TEXT[];
BEGIN
    SELECT ARRAY_AGG(url)
    INTO v_uncloned_urls
    FROM UNNEST(p_source_urls) AS url
    WHERE NOT EXISTS (
        SELECT 1 
        FROM public.cloned_sources 
        WHERE source_url = url 
        AND org_id = p_org_id
    );
    
    RETURN COALESCE(v_uncloned_urls, ARRAY[]::TEXT[]);
END;
$$;