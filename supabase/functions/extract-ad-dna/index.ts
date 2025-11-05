import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { video_url } = await req.json();
    
    if (!video_url) {
      return new Response(JSON.stringify({ error: "video_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🧬 Extracting Commercial DNA from: ${video_url}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // AI prompt to extract structural DNA
    const prompt = `Analyze this video URL and extract its "Commercial DNA" — the structural pattern that makes it effective as an advertisement.

Video URL: ${video_url}

Extract the following:

1. **Tone Profile**: Classify the overall tone (humorous, emotional, or professional)
2. **Structural Pattern**: Break down the ad into these components:
   - hook: The opening line/visual that grabs attention (first 3 seconds)
   - setup: The problem introduction or context
   - benefit: The core value proposition or transformation
   - cta: The call-to-action or closing message
3. **Replication Feasibility** (0-100): How easy is this to recreate with simple resources?

CRITICAL: Based ONLY on the URL structure and common patterns, provide your best analysis. If you can infer the platform (YouTube, TikTok, Instagram) from the URL, use that context.

Return ONLY valid JSON in this exact format:
{
  "tone_profile": "<humorous|emotional|professional>",
  "structural_pattern": {
    "hook": "<opening hook description>",
    "setup": "<problem/context description>",
    "benefit": "<transformation/value description>",
    "cta": "<call to action description>"
  },
  "replication_feasibility": <0-100>,
  "analysis_notes": "<brief notes on what makes this ad effective>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a viral video advertising analyst specializing in commercial DNA extraction. Always return valid JSON only." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI DNA extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const dnaText = data.choices?.[0]?.message?.content || "{}";
    const dna = JSON.parse(dnaText);

    console.log(`✅ DNA Extracted:`, {
      tone: dna.tone_profile,
      feasibility: dna.replication_feasibility,
      has_structure: !!dna.structural_pattern
    });

    return new Response(
      JSON.stringify({
        success: true,
        tone_profile: dna.tone_profile || "professional",
        structural_pattern: dna.structural_pattern || null,
        replication_feasibility: dna.replication_feasibility || 50,
        analysis_notes: dna.analysis_notes || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in extract-ad-dna:", error);
    return new Response(JSON.stringify({ error: `${error}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
