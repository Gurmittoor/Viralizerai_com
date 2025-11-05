import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScriptScene {
  scene_number: number
  duration: string
  visual_prompt: string
  audio_description: string
  caption_text: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.warn('⚠️  DEPRECATED: approve-script-and-render is deprecated. Use approve-script + start-production instead for better error handling and control.');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { job_id } = await req.json()
    console.log('Approving and rendering job:', job_id)

    if (!job_id) {
      throw new Error('job_id is required')
    }

    // Get the video job details
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      throw new Error(`Failed to fetch job: ${jobError?.message}`)
    }

    console.log('Job details:', { 
      id: job.id, 
      vertical: job.vertical,
      script_draft: job.script_draft ? 'present' : 'missing',
      cta_draft: job.cta_draft
    })

    // Update status to approved
    const { error: updateError } = await supabase
      .from('video_jobs')
      .update({ 
        script_approved: true,
        status: 'rendering',
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id)

    if (updateError) {
      throw new Error(`Failed to approve job: ${updateError.message}`)
    }

    console.log('Job approved, starting rendering...')

    // Parse the script - handle both JSON array and text format
    let scenes: ScriptScene[]
    try {
      if (typeof job.script_draft === 'string') {
        // Try parsing as JSON first
        try {
          scenes = JSON.parse(job.script_draft)
        } catch {
          // If JSON parse fails, parse text format
          scenes = []
          const sceneBlocks = job.script_draft.split(/Scene \d+ \(\d+-\d+s\):/).filter((s: string) => s.trim())
          
          for (let i = 0; i < sceneBlocks.length; i++) {
            const block = sceneBlocks[i].trim()
            const visualMatch = block.match(/Visual:\s*([^\n]+(?:\n(?!Caption:)[^\n]+)*)/i)
            const captionMatch = block.match(/Caption:\s*(.+)/i)
            
            if (visualMatch || captionMatch) {
              scenes.push({
                scene_number: i + 1,
                duration: "8s",
                visual_prompt: visualMatch ? visualMatch[1].trim() : "",
                audio_description: "",
                caption_text: captionMatch ? captionMatch[1].trim() : ""
              })
            }
          }
        }
      } else {
        scenes = job.script_draft as ScriptScene[]
      }
    } catch (parseError) {
      console.error('Failed to parse script_draft:', parseError)
      throw new Error('Invalid script format')
    }

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('Script must contain at least one scene')
    }

    console.log(`Rendering ${scenes.length} scenes...`)

    // Get Lovable API key for image generation
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('Missing LOVABLE_API_KEY')
    }

    // Generate images for each scene using Lovable AI
    const clipUrls: string[] = []
    const MAX_RETRIES = 3
    const INITIAL_BACKOFF_MS = 2000
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      console.log(`\n=== Generating Image for Scene ${i + 1}/${scenes.length} ===`)
      console.log('Visual prompt:', scene.visual_prompt)

      let imageUrl: string | null = null
      let lastError: Error | null = null

      // Retry loop with exponential backoff
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)
            console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${backoffMs}ms backoff...`)
            await new Promise(r => setTimeout(r, backoffMs))
          }

          const imageResponse = await fetch(
            'https://ai.gateway.lovable.dev/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-image-preview',
                messages: [
                  {
                    role: 'user',
                    content: `Generate a high-quality 9:16 vertical video frame for: ${scene.visual_prompt}`
                  }
                ],
                modalities: ['image', 'text']
              })
            }
          )

          console.log('Image API response status:', imageResponse.status)
          
          if (!imageResponse.ok) {
            const errorText = await imageResponse.text()
            console.error('Image API error response:', errorText)
            throw new Error(`Image API returned ${imageResponse.status}. Details: ${errorText}`)
          }

          const imageData = await imageResponse.json()
          console.log('Image API response received')

          // Extract base64 image from response
          const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url
          
          if (base64Image) {
            imageUrl = base64Image
            console.log(`✅ Image ${i + 1}/${scenes.length} generated successfully`)
            break // Success! Exit retry loop
          }

          throw new Error('No image URL returned from API')

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          console.error(`Attempt ${attempt + 1}/${MAX_RETRIES} failed for scene ${i + 1}:`, lastError.message)
          
          if (attempt === MAX_RETRIES - 1) {
            // Last attempt failed - throw error
            throw new Error(`Failed to generate image for scene ${i + 1} after ${MAX_RETRIES} attempts: ${lastError.message}`)
          }
          // Otherwise, continue to next retry attempt
        }
      }

      if (!imageUrl) {
        throw new Error(`No image URL obtained for scene ${i + 1} after all retries`)
      }

      clipUrls.push(imageUrl)
    }

    // Now stitch the images together using Shotstack
    console.log('\n=== Starting image stitching with Shotstack ===')
    console.log('Image URLs (base64):', clipUrls.length, 'images')

    const { data: stitchData, error: stitchError } = await supabase.functions.invoke(
      'process-video-clips',
      {
        body: {
          job_id,
          clip_urls: clipUrls,
          scenes,
          cta: job.cta_draft || 'Get Started Today'
        }
      }
    )

    if (stitchError) {
      console.error('Stitching error:', stitchError)
      throw new Error(`Failed to stitch clips: ${stitchError.message}`)
    }

    console.log('Stitching response:', stitchData)

    if (!stitchData?.video_url) {
      throw new Error('Stitching succeeded but no video URL returned')
    }

    // Update job with final video URL
    const { error: finalUpdateError } = await supabase
      .from('video_jobs')
      .update({
        final_url: stitchData.video_url,
        status: 'rendered',
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id)

    if (finalUpdateError) {
      console.error('Failed to update job with video URL:', finalUpdateError)
      throw new Error(`Failed to save video URL: ${finalUpdateError.message}`)
    }

    console.log('✅ Video rendering complete:', stitchData.video_url)

    return new Response(
      JSON.stringify({
        success: true,
        video_url: stitchData.video_url,
        message: 'Video rendered successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in approve-script-and-render:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
