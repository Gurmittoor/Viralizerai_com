import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScriptScene {
  scene_number: number;
  duration: number;
  visual_prompt: string;
  audio_description: string;
  caption_text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { job_id } = await req.json();

    if (!job_id) {
      throw new Error('job_id is required');
    }

    console.log('Starting production for job:', job_id);

    // Get job details
    const { data: job, error: fetchError } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (fetchError || !job) {
      throw new Error(`Failed to fetch job: ${fetchError?.message}`);
    }

    if (!job.script_approved) {
      throw new Error('Script must be approved before starting production');
    }

    // Update status to rendering
    await supabase
      .from('video_jobs')
      .update({
        status: 'rendering',
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    console.log('Job status updated to rendering');

    // Parse script
    let scenes: ScriptScene[] = [];
    try {
      scenes = JSON.parse(job.script_draft);
    } catch {
      const sceneBlocks = job.script_draft.split(/Scene \d+:/i).filter((s: string) => s.trim());
      scenes = sceneBlocks.map((block: string, idx: number) => {
        const lines = block.split('\n').filter((l: string) => l.trim());
        return {
          scene_number: idx + 1,
          duration: 5,
          visual_prompt: lines.find((l: string) => l.includes('Visual:'))?.replace(/Visual:/i, '').trim() || 
                        lines.find((l: string) => l.includes('Visuals:'))?.replace(/Visuals:/i, '').trim() || 
                        lines[0]?.trim() || '',
          audio_description: lines.find((l: string) => l.includes('Audio:'))?.replace(/Audio:/i, '').trim() || '',
          caption_text: lines.find((l: string) => l.includes('Caption:'))?.replace(/Caption:/i, '').trim() || ''
        };
      });
    }

    console.log(`Processing ${scenes.length} scenes`);

    // Generate images for each scene
    const imageUrls: string[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`Generating image for scene ${scene.scene_number}...`);
      
      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{
                role: "user",
                content: `Create a professional video frame: ${scene.visual_prompt}. Ultra high resolution, cinematic, 16:9 aspect ratio.`
              }],
              modalities: ["image", "text"]
            })
          });

          if (!response.ok) {
            throw new Error(`Image generation failed with status ${response.status}`);
          }

          const data = await response.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageUrl) {
            throw new Error('No image URL in response');
          }

          imageUrls.push(imageUrl);
          console.log(`Scene ${scene.scene_number} image generated successfully`);
          success = true;

        } catch (error) {
          retries++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Attempt ${retries} failed for scene ${scene.scene_number}:`, errorMsg);
          
          if (retries >= maxRetries) {
            throw new Error(`Failed to render scene ${scene.scene_number} after ${maxRetries} attempts: ${errorMsg}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        }
      }
    }

    console.log('All scene images generated, stitching video...');

    // Stitch images into video using process-video-clips
    const { data: videoData, error: videoError } = await supabase.functions.invoke(
      'process-video-clips',
      {
        body: {
          job_id,
          image_urls: imageUrls,
          scenes
        }
      }
    );

    if (videoError) {
      throw new Error(`Video stitching failed: ${videoError.message}`);
    }

    console.log('Video stitched successfully:', videoData);

    // Update job with final video URL
    await supabase
      .from('video_jobs')
      .update({
        final_url: videoData.url,
        status: 'rendered',
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    console.log('Production completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        video_url: videoData.url,
        message: 'Video production completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in start-production:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update job status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { job_id } = await req.json();
      
      if (job_id) {
        await supabase
          .from('video_jobs')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
