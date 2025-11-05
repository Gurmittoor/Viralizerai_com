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
    const supabaseClient = createClient(
      Deno.env.get('MY_SUPABASE_URL') ?? '',
      Deno.env.get('MY_SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { trend_id, brand_id, post_targets } = await req.json();

    console.log('Recreating video from URL:', { trend_id, brand_id, post_targets });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's org_id
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get trend details
    const { data: trend, error: trendError } = await supabaseClient
      .from('trends')
      .select('*')
      .eq('id', trend_id)
      .single();

    if (trendError || !trend) {
      return new Response(
        JSON.stringify({ error: 'Trend not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand details if brand_id provided
    let brandName = 'Your Brand';
    if (brand_id) {
      const { data: brand } = await supabaseClient
        .from('brands')
        .select('name')
        .eq('id', brand_id)
        .single();
      
      if (brand) {
        brandName = brand.name;
      }
    }

    // Calculate credits cost: 120 base + 10 per platform variant
    const platformCount = (post_targets || ['tiktok', 'youtube_shorts']).length;
    const creditsCost = 120 + (10 * platformCount);

    // Check and charge credits
    const { data: wallet, error: walletError } = await supabaseClient
      .from('credits_wallet')
      .select('current_credits')
      .eq('org_id', userData.org_id)
      .single();

    if (walletError || !wallet || wallet.current_credits < creditsCost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Charge credits
    const { error: chargeError } = await supabaseClient.rpc('charge_credits', {
      _org_id: userData.org_id,
      _feature: 'recreate_from_url',
      _cost: creditsCost,
      _description: `Recreate video from ${trend.platform} viral trend`
    });

    if (chargeError) {
      console.error('Error charging credits:', chargeError);
      return new Response(
        JSON.stringify({ error: 'Failed to charge credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create video job
    const { data: videoJob, error: jobError } = await supabaseClient
      .from('video_jobs')
      .insert({
        org_id: userData.org_id,
        brand_id: brand_id || null,
        trend_id: trend_id,
        status: 'queued',
        compliance_status: 'unchecked',
        post_targets: post_targets || ['tiktok', 'youtube_shorts'],
        target_vertical: trend.category || 'general',
        campaign_type: 'brand_awareness',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating video job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video job created successfully:', videoJob.id);

    return new Response(
      JSON.stringify({ 
        video_job_id: videoJob.id,
        credits_charged: creditsCost,
        message: 'Video recreation started'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in recreate-from-url:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});