import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { job_id, clip_urls, scenes, cta } = await req.json();

    console.log(`Processing ${clip_urls.length} clips for job ${job_id}`);

    // 1. Download all 8 clips
    const clips: Uint8Array[] = [];
    for (let i = 0; i < clip_urls.length; i++) {
      console.log(`Downloading clip ${i + 1}/8...`);
      const response = await fetch(clip_urls[i]);
      if (!response.ok) {
        throw new Error(`Failed to download clip ${i + 1}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      clips.push(new Uint8Array(buffer));
    }

    console.log('✅ All clips downloaded, starting FFmpeg processing...');

    // 2. Use FFmpeg to stitch clips together
    // Note: This requires FFmpeg WASM or a video processing API
    // For now, we'll use a video processing API (e.g., CloudConvert, Shotstack)
    
    const SHOTSTACK_API_KEY = Deno.env.get('SHOTSTACK_API_KEY');
    if (!SHOTSTACK_API_KEY) {
      throw new Error('SHOTSTACK_API_KEY not configured. This is required for video stitching and caption overlays.');
    }

    // Build Shotstack timeline with captions
    const timeline = {
      soundtrack: {
        src: "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/moment.mp3",
        effect: "fadeOut"
      },
      tracks: [
        // Caption track
        {
          clips: scenes.map((scene: any, index: number) => ({
            asset: {
              type: "html",
              html: `<div style="font-family: Arial, sans-serif; font-size: 48px; font-weight: bold; color: white; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); padding: 20px; background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0)); width: 100%; position: absolute; top: 20%;">${scene.caption_text}</div>`,
              css: "body { margin: 0; padding: 0; }",
              width: 1080,
              height: 1920
            },
            start: index * 8,
            length: 8,
            transition: {
              in: "fade",
              out: "fade"
            }
          }))
        },
        // CTA overlay at the end
        {
          clips: [
            {
              asset: {
                type: "html",
                html: `<div style="font-family: Arial, sans-serif; font-size: 56px; font-weight: bold; color: white; text-align: center; text-shadow: 3px 3px 6px rgba(0,0,0,0.9); padding: 40px; background: linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.9)); border-radius: 20px; width: 80%; margin: auto; position: absolute; top: 40%; left: 10%;">${cta}</div>`,
                css: "body { margin: 0; padding: 0; }",
                width: 1080,
                height: 1920
              },
              start: 56,
              length: 8,
              transition: {
                in: "slideUp",
                out: "fade"
              }
            }
          ]
        },
        // Video clips track
        {
          clips: clip_urls.map((url: string, index: number) => ({
            asset: {
              type: "video",
              src: url
            },
            start: index * 8,
            length: 8,
            transition: {
              in: index === 0 ? "fade" : "crossfade",
              out: "fade"
            }
          }))
        }
      ]
    };

    const output = {
      format: "mp4",
      resolution: "1080x1920",
      aspectRatio: "9:16",
      fps: 30,
      quality: "high"
    };

    // Submit to Shotstack API
    const renderResponse = await fetch('https://api.shotstack.io/v1/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SHOTSTACK_API_KEY
      },
      body: JSON.stringify({
        timeline,
        output
      })
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      throw new Error(`Shotstack API error: ${errorText}`);
    }

    const renderData = await renderResponse.json();
    const renderId = renderData.response.id;

    console.log(`✅ Render submitted to Shotstack: ${renderId}`);
    console.log('⏳ Waiting for render to complete...');

    // Poll for render completion
    let finalUrl = '';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
        headers: {
          'x-api-key': SHOTSTACK_API_KEY
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check render status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      const status = statusData.response.status;

      console.log(`Render status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);

      if (status === 'done') {
        finalUrl = statusData.response.url;
        console.log(`✅ Render complete! Video URL: ${finalUrl}`);
        break;
      } else if (status === 'failed') {
        throw new Error(`Render failed: ${statusData.response.error}`);
      }

      attempts++;
    }

    if (!finalUrl) {
      throw new Error('Render timeout - video processing took too long');
    }

    return new Response(
      JSON.stringify({
        success: true,
        final_url: finalUrl,
        render_id: renderId,
        clips_processed: clip_urls.length,
        message: 'Video stitched with captions and CTA overlay'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing video clips:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
