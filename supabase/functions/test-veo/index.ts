// Test function to verify Veo API integration
// Call this to check if your GOOGLE_AI_API_KEY and VEO_PROJECT_ID are working

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')
    const VEO_PROJECT_ID = Deno.env.get('VEO_PROJECT_ID')

    console.log('🔍 Testing Veo API integration...')
    console.log('GOOGLE_AI_API_KEY exists:', !!GOOGLE_AI_API_KEY)
    console.log('VEO_PROJECT_ID exists:', !!VEO_PROJECT_ID)

    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured in Lovable Secrets')
    }

    if (!VEO_PROJECT_ID) {
      throw new Error('VEO_PROJECT_ID not configured in Lovable Secrets')
    }

    // Test prompt
    const testPrompt = 'A cinematic closeup of a smiling realtor shaking hands after closing a deal, soft daylight, professional commercial quality, smooth camera movement, 9:16 vertical aspect ratio'

    console.log('📤 Sending test request to Veo API...')
    console.log('Prompt:', testPrompt)

    const veoResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/veo-3.1-fast:generateVideo?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'veo-3.1-fast',
          prompt: { text: testPrompt },
          video_config: {
            duration_seconds: 8,
            aspect_ratio: '9:16',
            fps: 30,
            quality: 'standard',
          },
          project_id: VEO_PROJECT_ID,
        }),
      }
    )

    console.log('📥 Veo response status:', veoResponse.status, veoResponse.statusText)

    const responseText = await veoResponse.text()
    console.log('📄 Veo raw response:', responseText)

    if (!veoResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Veo API error',
          status: veoResponse.status,
          statusText: veoResponse.statusText,
          details: responseText,
          troubleshooting: {
            401: 'Invalid GOOGLE_AI_API_KEY - check your API key in Lovable Secrets',
            403: 'API key valid but project access denied - verify VEO_PROJECT_ID',
            404: 'Endpoint not found - check if Veo API is enabled in your Google Cloud project',
            400: 'Bad request - check payload format',
          }[veoResponse.status] || 'Unknown error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 so we can see the error details
        }
      )
    }

    let veoData
    try {
      veoData = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Failed to parse Veo response: ${responseText}`)
    }

    console.log('✅ Veo data parsed:', JSON.stringify(veoData, null, 2))

    // Check if we got a video URL directly or a job ID
    const videoUrl = veoData.videoUri || veoData.url
    const jobId = veoData.job || veoData.name

    if (videoUrl) {
      console.log('🎬 Video URL received immediately:', videoUrl)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Veo test successful! Video generated immediately.',
          videoUrl,
          fullResponse: veoData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (jobId) {
      console.log('⏳ Job queued, polling for completion...')
      
      // Poll up to 10 times (5 minutes max)
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 30000)) // Wait 30s
        
        console.log(`🔄 Poll attempt ${i + 1}/10...`)
        
        const pollResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/veo-3.1-fast:getVideo?key=${GOOGLE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job: jobId,
              project_id: VEO_PROJECT_ID,
            }),
          }
        )

        const pollText = await pollResponse.text()
        console.log('Poll response:', pollText)

        if (pollResponse.ok) {
          const pollData = JSON.parse(pollText)
          const completedUrl = pollData.videoUri || pollData.url
          
          if (completedUrl) {
            console.log('🎬 Video ready:', completedUrl)
            return new Response(
              JSON.stringify({
                success: true,
                message: `Veo test successful! Video generated after ${(i + 1) * 30} seconds.`,
                videoUrl: completedUrl,
                jobId,
                pollAttempts: i + 1,
                fullResponse: pollData
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      }

      // Timeout
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Veo job timed out after 5 minutes',
          jobId,
          message: 'Job was queued but did not complete. This may be normal for Veo - check Google Cloud Console.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No video URL and no job ID
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unexpected Veo response format',
        details: veoData,
        message: 'Veo API responded but returned neither videoUri nor job ID'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Veo test error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
