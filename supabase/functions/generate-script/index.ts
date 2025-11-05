// Supabase Edge Function: generate-script
// Generates 8 scenes of 8 seconds each for Veo 3.1 Fast rendering

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

interface GeneratedScript {
  scenes: ScriptScene[]
  hook: string
  cta: string
  total_duration: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { video_job_id, brand_id } = await req.json()

    console.log(`Generating 8x8 script for video job: ${video_job_id}`)

    // Get brand info
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single()

    if (!brand) {
      throw new Error('Brand not found')
    }

    // Use Lovable AI instead of Google Gemini
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    // Standard CTA format - always use this exact text
    const CTA_TEXT = `Try ${brand.brand_domain || 'AIAgents247.ca'}`;
    
    const scriptPrompt = `You are a viral video script writer. Create an 8-scene video script for ${brand.name}.

CRITICAL REQUIREMENTS - READ CAREFULLY:
- EXACTLY 8 scenes, NO MORE, NO LESS
- Each scene MUST be EXACTLY 8 seconds long
- Total duration: EXACTLY 64 seconds (8 × 8 = 64)
- Use ONLY these exact duration formats (copy exactly):
  * Scene 1: "0-8s"
  * Scene 2: "8-16s"
  * Scene 3: "16-24s"
  * Scene 4: "24-32s"
  * Scene 5: "32-40s"
  * Scene 6: "40-48s"
  * Scene 7: "48-56s"
  * Scene 8: "56-64s"
- DO NOT use any other timing format (no "3s", "5s", "7s", etc.)
- NO TEXT OR WORDS in visual_prompt (Veo can't render text properly)
- visual_prompt: Pure visual description (actions, objects, emotions, cinematography)
- caption_text: The text that will be overlaid AFTER rendering
- audio_description: What will be SPOKEN (use phonetic spelling like "A-I Agents two-four-seven dot C-A")
- Use compliant language (no "NEVER", "ALWAYS", "100%", "GUARANTEED")
- Scene 8 caption_text MUST be EXACTLY: "${CTA_TEXT}"
- DO NOT add "Book Demo", "Visit", or any other prefix to the CTA
- DO NOT use phonetic spelling in caption_text (that's only for audio_description)

Product: ${brand.product_service}
Target: ${brand.target_platforms?.join(', ')}

Return JSON in this EXACT format:
{
  "hook": "Opening hook line (will be shown as caption)",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-8s",
      "visual_prompt": "Close-up of frustrated business owner checking phone repeatedly, worried expression, office background, natural lighting, handheld camera movement",
      "audio_description": "Tense ambient music begins, slight heartbeat rhythm",
      "caption_text": "Missing calls after hours?"
    },
    {
      "scene_number": 2,
      "duration": "8-16s",
      "visual_prompt": "...",
      "audio_description": "...",
      "caption_text": "..."
    },
    ... (6 more scenes with exact timing)
    {
      "scene_number": 8,
      "duration": "56-64s",
      "visual_prompt": "Professional business owner or company logo, clean modern background",
      "audio_description": "Voice says: ${brand.cta_voice_line || 'Try A-I Agents two-four-seven dot C-A'}",
      "caption_text": "${CTA_TEXT}"
    }
  ],
  "cta": "${CTA_TEXT}",
  "total_duration": "64s"
}`

    // Call Lovable AI for script generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a viral video script writer. Return only valid JSON.' },
          { role: 'user', content: scriptPrompt }
        ],
        temperature: 0.8,
      })
    })

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const scriptText = aiData.choices[0].message.content

    // Extract JSON from potential markdown code blocks
    let scriptJson: GeneratedScript
    try {
      const jsonMatch = scriptText.match(/```json\n?([\s\S]*?)\n?```/) || scriptText.match(/{[\s\S]*}/)
      scriptJson = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : scriptText)
    } catch (e) {
      throw new Error(`Failed to parse script JSON: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Validate script structure
    if (!scriptJson.scenes || scriptJson.scenes.length !== 8) {
      throw new Error(`Invalid script: expected 8 scenes, got ${scriptJson.scenes?.length || 0}`)
    }

    // Define exact required durations for 8×8 format
    const requiredDurations = [
      '0-8s',
      '8-16s', 
      '16-24s',
      '24-32s',
      '32-40s',
      '40-48s',
      '48-56s',
      '56-64s'
    ]

    // Validate each scene has exact 8-second timing
    scriptJson.scenes.forEach((scene, idx) => {
      const expectedDuration = requiredDurations[idx]
      
      if (scene.duration !== expectedDuration) {
        console.error(`❌ Scene ${idx + 1} has wrong duration: "${scene.duration}" (expected "${expectedDuration}")`)
        // Auto-correct the duration
        scene.duration = expectedDuration
        console.log(`✅ Auto-corrected Scene ${idx + 1} to ${expectedDuration}`)
      }

      // Ensure no text in visual prompts
      const lowerPrompt = scene.visual_prompt.toLowerCase()
      const textKeywords = ['text', 'words', 'letters', 'writing', 'sign', 'label', 'caption', 'subtitle']
      
      if (textKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        console.warn(`⚠️ Scene ${idx + 1} visual prompt contains text-related words`)
        scene.visual_prompt = scene.visual_prompt.replace(/text|words|letters|writing|sign|label|caption|subtitle/gi, '')
      }

      // Enforce standard CTA format for Scene 8
      if (idx === 7) { // Scene 8 (0-indexed)
        if (scene.caption_text !== CTA_TEXT) {
          console.warn(`⚠️ Scene 8 CTA was "${scene.caption_text}", correcting to "${CTA_TEXT}"`)
          scene.caption_text = CTA_TEXT
        }
      }
    })

    // Ensure total duration is 64s
    scriptJson.total_duration = '64s'
    
    // Enforce standard CTA format
    scriptJson.cta = CTA_TEXT

    // Update video job with script and CTA
    await supabase
      .from('video_jobs')
      .update({
        script_draft: JSON.stringify(scriptJson),
        cta_custom: CTA_TEXT,
        status: 'script_ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', video_job_id)

    console.log(`✅ Script generated successfully for ${video_job_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        script: scriptJson,
        message: '8x8 script generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Script generation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
