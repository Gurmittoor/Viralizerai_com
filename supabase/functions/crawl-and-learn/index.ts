import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { url, type = 'self', label } = await req.json();

    if (!url || !url.startsWith('http')) {
      throw new Error('Valid URL is required');
    }

    console.log(`Crawling URL: ${url}, Type: ${type}`);

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.org_id) {
      throw new Error('User organization not found');
    }

    const orgId = userData.org_id;

    // Charge credits for market intelligence crawl (50 credits = $0.50)
    const creditCost = 50;
    
    console.log(`Attempting to charge ${creditCost} credits for org: ${orgId}`);
    
    const { data: creditResult, error: creditError } = await supabase
      .rpc('charge_credits', {
        _org_id: orgId,
        _feature: 'market_intel_crawl',
        _cost: creditCost,
        _description: `Market Brain: Crawl ${url}`
      });

    console.log('Credit charge result:', { creditResult, creditError });

    if (creditError) {
      console.error('Credit charge failed:', creditError);
      throw new Error(`Credit charge failed: ${creditError.message}`);
    }
    
    if (!creditResult) {
      console.error('Credit charge returned false');
      throw new Error('Insufficient credits');
    }

    // Upsert org_sources
    const { data: source, error: sourceError } = await supabase
      .from('org_sources')
      .upsert({
        org_id: orgId,
        url,
        type,
        label: label || url,
        crawl_status: 'pending',
        active: true
      }, {
        onConflict: 'org_id,url'
      })
      .select()
      .single();

    if (sourceError) {
      console.error('Failed to create source:', sourceError);
      throw new Error('Failed to save source');
    }

    // Fetch the website content
    let pageContent = '';
    let crawlError = null;

    try {
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'VideoFactory247-Bot/1.0'
        }
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}`);
      }

      const html = await fetchResponse.text();
      
      // Extract text content (simple extraction)
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000); // Limit to 50k chars

      console.log(`Extracted ${pageContent.length} characters from ${url}`);

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      crawlError = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
      
      // Update source with error
      await supabase
        .from('org_sources')
        .update({
          crawl_status: 'error',
          last_crawled_at: new Date().toISOString()
        })
        .eq('id', source.id);

      throw new Error(`Failed to crawl URL: ${crawlError}`);
    }

    // Use AI to extract insights
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const analysisPrompt = `You are analyzing a business website to extract marketing intelligence.

Website content:
${pageContent}

Extract the following structured information:

1. NICHE_VERTICAL: What industry/vertical is this? (e.g., "plumbers", "hvac", "injury lawyers", "towing", etc.)

2. HEADLINE_OFFERS: What are the main offers, guarantees, or unique value props? List 3-5 bullet points.

3. PAIN_POINTS: What customer problems or fears does this address? List 3-5 bullet points.

4. OBJECTIONS: What customer objections or concerns do they address? List 3-5 bullet points.

5. PROOF_POINTS: What social proof, credentials, or trust signals do they use? List 3-5 bullet points.

6. BRAND_VOICE: Describe the tone/voice (e.g., "aggressive, competitive", "calm, trustworthy", "urgent, fear-based")

7. COMPETITIVE_ANGLE: ${type === 'competitor' ? 'What are their weaknesses or gaps we could exploit?' : 'What makes this business unique?'}

Return as JSON:
{
  "niche_vertical": "...",
  "headline_offers": ["..."],
  "pain_points": ["..."],
  "objections": ["..."],
  "proof_points": ["..."],
  "brand_voice_notes": "...",
  "competitor_angle": "..."
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a marketing intelligence analyst. Extract structured insights from website content.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI analysis failed:', errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const insightsText = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI insights:', insightsText);

    // Parse JSON from AI response
    let insights: any;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = insightsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI insights');
    }

    // Store insights
    const { data: insightData, error: insightError } = await supabase
      .from('org_market_insights')
      .insert({
        org_id: orgId,
        source_id: source.id,
        niche_vertical: insights.niche_vertical || 'general',
        headline_offers: insights.headline_offers || [],
        pain_points: insights.pain_points || [],
        objections: insights.objections || [],
        proof_points: insights.proof_points || [],
        brand_voice_notes: insights.brand_voice_notes || '',
        competitor_angle: insights.competitor_angle || '',
        last_generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insightError) {
      console.error('Failed to save insights:', insightError);
      throw new Error('Failed to save insights');
    }

    // Update source as successful
    await supabase
      .from('org_sources')
      .update({
        crawl_status: 'ok',
        last_crawled_at: new Date().toISOString()
      })
      .eq('id', source.id);

    console.log(`Successfully analyzed ${url}, created insight ${insightData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId: source.id,
        insightId: insightData.id,
        insights: insightData,
        creditsCharged: creditCost
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in crawl-and-learn:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
