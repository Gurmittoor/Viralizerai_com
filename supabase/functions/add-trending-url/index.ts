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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { platform, video_url, category, title, view_count, thumbnail_url, brand_notes } = await req.json();

    console.log('Adding trending URL:', { platform, video_url, category, title });

    // Validate platform
    const validPlatforms = ['tiktok', 'youtube', 'instagram', 'facebook', 'x'];
    if (!validPlatforms.includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform. Must be one of: tiktok, youtube, instagram, facebook, x' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    if (!video_url || typeof video_url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert or update trend
    const { data: trend, error } = await supabaseClient
      .from('trends')
      .upsert({
        platform,
        source_video_url: video_url,
        category: category || 'general',
        title: title || 'Untitled',
        views: view_count || 0,
        thumbnail_url: thumbnail_url || null,
        brand_notes: brand_notes || null,
        engagement_score: 0,
        likes: 0,
        comments: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting trend:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Trend added successfully:', trend.id);

    return new Response(
      JSON.stringify({ trend }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in add-trending-url:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});