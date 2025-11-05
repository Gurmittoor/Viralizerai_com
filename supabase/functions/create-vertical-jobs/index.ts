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

    const { verticals, useMarketBrain = true } = await req.json();

    if (!verticals || !Array.isArray(verticals) || verticals.length === 0) {
      throw new Error('verticals array is required and must not be empty');
    }

    console.log(`Creating jobs for ${verticals.length} verticals, Market Brain: ${useMarketBrain}`);

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

    // Get org settings including autopilot mode
    const { data: org } = await supabase
      .from('organizations')
      .select('*, autopilot_enabled')
      .eq('id', orgId)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    const autopilotEnabled = (org as any).autopilot_enabled ?? false;
    console.log(`Autopilot mode: ${autopilotEnabled}`);

    const results: any[] = [];
    const errors: any[] = [];

    // Process each vertical
    for (const vertical of verticals) {
      try {
        const normalizedVertical = vertical.toLowerCase().trim().replace(/\s+/g, '-');
        
        // Determine brand label
        let brandLabel = 'AIAgents247.ca';
        if (vertical.toLowerCase().includes('realtor') || vertical.toLowerCase().includes('real estate')) {
          brandLabel = 'AIRealtors247.ca';
        } else if (vertical.toLowerCase().includes('lawyer') || vertical.toLowerCase().includes('legal')) {
          brandLabel = 'AILawyers247.ca';
        }

        // Try to get market insights for this vertical
        let insightId = null;
        let insights = null;

        if (useMarketBrain) {
          const { data: insightData } = await supabase
            .from('org_market_insights')
            .select('*')
            .eq('org_id', orgId)
            .ilike('niche_vertical', `%${vertical}%`)
            .order('last_generated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (insightData) {
            insightId = insightData.id;
            insights = insightData;
            console.log(`Found market insights for ${vertical}:`, {
              offers: insightData.headline_offers?.length,
              pains: insightData.pain_points?.length
            });
          }
        }

        // Charge ONLY script generation credits (2 credits = $0.02)
        // Full render credits (120+) will be charged on approval
        const scriptCost = 2;
        const { data: creditResult, error: creditError } = await supabase
          .rpc('charge_credits', {
            _org_id: orgId,
            _feature: 'script_generation',
            _cost: scriptCost,
            _description: `Generate script draft for ${vertical}`
          });

        if (creditError || !creditResult) {
          console.error(`Failed to charge script credits for ${vertical}:`, creditError);
          errors.push({
            vertical,
            error: 'Insufficient credits for script generation'
          });
          continue;
        }

        // Create the video job in script_ready state (not render queue yet)
        const { data: job, error: jobError } = await supabase
          .from('video_jobs')
          .insert({
            org_id: orgId,
            target_vertical: normalizedVertical,
            brand_label: brandLabel,
            insight_id: insightId,
            status: 'script_ready',
            script_approved: false,
            autopilot_snapshot: autopilotEnabled,
            compliance_status: 'unchecked',
            cta_custom: org.cta_voice_line || `Visit ${org.brand_domain || 'AIAgents247.ca'}`,
            post_targets: org.target_verticals?.includes(vertical.toLowerCase()) 
              ? ['tiktok', 'youtube_shorts', 'instagram_reels']
              : ['tiktok', 'youtube_shorts'],
            campaign_type: 'brand_awareness'
          })
          .select()
          .single();

        if (jobError) {
          console.error(`Failed to create job for ${vertical}:`, jobError);
          errors.push({
            vertical,
            error: jobError.message
          });
          continue;
        }

        console.log(`Created job ${job.id} for ${vertical} (script stage)`);

        // Generate script draft using background task
        try {
          const scriptResponse = await fetch(`${supabaseUrl}/functions/v1/generate-script-draft`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ job_id: job.id })
          });

          const scriptResult = await scriptResponse.json();
          
          if (scriptResult.success && scriptResult.compliant && autopilotEnabled) {
            // In autopilot mode with compliant script, auto-approve and render
            console.log(`Autopilot: auto-approving job ${job.id}`);
            
            // Step 1: Approve the script
            const approveResponse = await fetch(`${supabaseUrl}/functions/v1/approve-script`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ job_id: job.id })
            });

            const approveResult = await approveResponse.json();
            console.log(`Autopilot approval result:`, approveResult);
            
            if (approveResult.success) {
              // Step 2: Start production
              console.log(`Autopilot: starting production for job ${job.id}`);
              
              const productionResponse = await fetch(`${supabaseUrl}/functions/v1/start-production`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ job_id: job.id })
              });

              const productionResult = await productionResponse.json();
              console.log(`Autopilot production result:`, productionResult);
            } else {
              console.error(`Autopilot approval failed for job ${job.id}:`, approveResult);
            }
          }
        } catch (scriptError) {
          console.error(`Error in script generation for ${vertical}:`, scriptError);
          // Job still created, user can manually trigger script generation
        }

        results.push({
          vertical,
          jobId: job.id,
          brandLabel,
          insightUsed: !!insightId,
          creditsCharged: scriptCost,
          autopilot: autopilotEnabled
        });

      } catch (verticalError) {
        console.error(`Error processing ${vertical}:`, verticalError);
        errors.push({
          vertical,
          error: verticalError instanceof Error ? verticalError.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
        totalCreditsCharged: results.reduce((sum, r) => sum + r.creditsCharged, 0)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create-vertical-jobs:', error);
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
