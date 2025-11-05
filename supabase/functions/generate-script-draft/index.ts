import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScriptScene {
  scene_number: number;
  duration: string; // "0-8s", "8-16s", etc.
  visual_prompt: string; // NO TEXT/WORDS - pure visual description for Veo
  audio_description: string; // Background music/sounds
  caption_text: string; // Text to overlay AFTER rendering
}

// Generate 8×8 viral script (8 scenes × 8 seconds = 64 seconds)
function generateViralScript(
  vertical: string,
  orgInfo: any,
  marketInsights: any,
  ctaLine: string
): { script: ScriptScene[], fullText: string } {
  const industry = orgInfo.industry || vertical;
  const tone = orgInfo.tone_profile || 'professional';
  
  // Extract Market Brain insights
  const painPoints = marketInsights?.pain_points || [];
  const proofPoints = marketInsights?.proof_points || [];
  
  const mainPain = painPoints[0] || `${industry} emergencies happen when you least expect them`;
  const mainProof = proofPoints[0] || `24/7 AI-powered service`;
  
  // Build 8-scene viral script - EXACTLY 8 seconds each
  // CRITICAL: visual_prompt has NO TEXT/WORDS (Veo can't render text properly)
  const scenes: ScriptScene[] = [
    {
      scene_number: 1,
      duration: "0-8s",
      visual_prompt: "Close-up of smartphone screen showing multiple missed call notifications, finger scrolling anxiously, frustrated expression in reflection, natural office lighting, handheld camera movement",
      audio_description: "Tense ambient music, phone notification sounds",
      caption_text: `STOP! Losing ${vertical} customers because nobody answers?`
    },
    {
      scene_number: 2,
      duration: "8-16s",
      visual_prompt: "Wide shot of empty business reception desk at night, phone ringing continuously, red emergency lights flashing outside window, dramatic shadows",
      audio_description: "Phone ringing echo, urgent background music building",
      caption_text: mainPain
    },
    {
      scene_number: 3,
      duration: "16-24s",
      visual_prompt: "Split screen showing competitor answering calls while your business phone goes to voicemail, customer choosing competitor business card, disappointed face",
      audio_description: "Tick-tock clock sound, heartbeat rhythm",
      caption_text: `Most ${industry} businesses lose leads after hours. Nobody there to answer.`
    },
    {
      scene_number: 4,
      duration: "24-32s",
      visual_prompt: "Glowing AI holographic interface appearing over desk, futuristic blue light patterns, smooth camera push-in, professional modern office environment",
      audio_description: "Uplifting transition music, tech interface sounds",
      caption_text: "What if an AI receptionist answered 24/7?"
    },
    {
      scene_number: 5,
      duration: "32-40s",
      visual_prompt: "Phone screen showing incoming call being connected, conversation bubbles appearing smoothly, calendar slots filling up with appointments, happy customer nodding",
      audio_description: "Success chime sounds, upbeat background music",
      caption_text: "AI Agents 247 answers every call in seconds. Books appointments. Qualifies leads."
    },
    {
      scene_number: 6,
      duration: "40-48s",
      visual_prompt: "Dashboard showing increasing revenue graphs, multiple phone conversations happening simultaneously on screens, notification badges counting up rapidly",
      audio_description: "Achievement sounds, inspiring music crescendo",
      caption_text: mainProof
    },
    {
      scene_number: 7,
      duration: "48-56s",
      visual_prompt: "Time-lapse of appointment calendar filling up overnight, customers smiling on video calls, revenue counter increasing, competitor businesses with empty calendars fading out",
      audio_description: "Urgent motivational music building",
      caption_text: `Stop losing ${vertical} customers. Capture every opportunity, 24/7.`
    },
    {
      scene_number: 8,
      duration: "56-64s",
      visual_prompt: "Professional business owner smiling confidently at camera, modern office background, subtle AI glow effect around phone, thumbs up gesture, smooth zoom out to full office view",
      audio_description: "Uplifting music finale, success tone",
      caption_text: ctaLine
    }
  ];
  
  const fullText = scenes.map(s => 
    `Scene ${s.scene_number} (${s.duration}):\nVisual: ${s.visual_prompt}\nCaption: ${s.caption_text}`
  ).join('\n\n');
  
  return { script: scenes, fullText };
}

// Check script for compliance violations
function checkCompliance(
  scriptText: string,
  forbiddenClaims: string[],
  policies: any[]
): { compliant: boolean, issues: string[] } {
  const issues: string[] = [];
  const lowerScript = scriptText.toLowerCase();
  
  // Check forbidden claims
  for (const claim of forbiddenClaims) {
    const lowerClaim = claim.toLowerCase();
    if (lowerScript.includes(lowerClaim)) {
      issues.push(`Contains forbidden claim: "${claim}"`);
    }
  }
  
  // Check for absolute promises
  const absoluteTerms = ['100%', 'guaranteed', 'always', 'never miss', 'instant'];
  for (const term of absoluteTerms) {
    if (lowerScript.includes(term.toLowerCase())) {
      issues.push(`Risky absolute claim detected: "${term}"`);
    }
  }
  
  // Check for unverified stats
  if (lowerScript.match(/\d{2,3}%/) && !lowerScript.includes('source:')) {
    issues.push('Statistical claims should have sources');
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { job_id } = await req.json();

    console.log('Generating script draft for job:', job_id);

    // 1. Fetch video job with org info
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .select(`
        *,
        organizations!inner(
          industry,
          tone_profile,
          service_area,
          cta_voice_line,
          brand_domain,
          forbidden_claims,
          requires_manual_review_before_post
        )
      `)
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    const orgInfo = (job as any).organizations;
    const vertical = job.target_vertical || 'general';

    // 2. Fetch Market Brain insights for this vertical
    const { data: insights } = await supabase
      .from('org_market_insights')
      .select('*')
      .eq('org_id', job.org_id)
      .eq('niche_vertical', vertical)
      .maybeSingle();

    // 3. Prepare CTA line
    const ctaLine = orgInfo.cta_voice_line || `Visit ${orgInfo.brand_domain || 'AIAgents247.ca'}`;

    // 4. Generate script
    const { script, fullText } = generateViralScript(
      vertical,
      orgInfo,
      insights,
      ctaLine
    );

    // 5. Check compliance
    const compliance = checkCompliance(
      fullText,
      orgInfo.forbidden_claims || [],
      [] // policies would be fetched separately
    );

    // 6. Update job with script draft
    const updates: any = {
      script_draft: fullText,
      cta_custom: ctaLine,
      scene_prompts: script,
    };

    if (!compliance.compliant) {
      updates.compliance_status = 'flagged';
      updates.status = 'manual_review';
      updates.compliance_report = {
        issues: compliance.issues.map(issue => ({
          severity: 'high',
          description: issue,
          fix: 'Edit script to remove this claim'
        }))
      };
    } else if (orgInfo.requires_manual_review_before_post) {
      updates.status = 'script_ready';
      updates.compliance_status = 'pending';
    } else {
      updates.status = 'script_ready';
      updates.compliance_status = 'passed';
    }

    const { error: updateError } = await supabase
      .from('video_jobs')
      .update(updates)
      .eq('id', job_id);

    if (updateError) {
      throw updateError;
    }

    console.log('Script draft generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        compliant: compliance.compliant,
        issues: compliance.issues,
        status: updates.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating script draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
