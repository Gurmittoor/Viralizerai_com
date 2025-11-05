import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { trend_id } = await req.json();
    
    if (!trend_id) {
      return new Response(JSON.stringify({ error: "trend_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🧠 AI Scoring & Adapting trend: ${trend_id}`);

    // Get the trend video details
    const { data: trend, error: trendError } = await supabase
      .from("trends")
      .select("*")
      .eq("id", trend_id)
      .single();

    if (trendError || !trend) {
      return new Response(JSON.stringify({ error: "Trend not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get reference ads for DNA comparison (if any exist)
    const { data: referenceAds } = await supabase
      .from("reference_ads")
      .select("script, tone_profile, structural_pattern, performance_score")
      .order("performance_score", { ascending: false })
      .limit(5);

    const referenceContext = referenceAds && referenceAds.length > 0
      ? `\n\nReference Patterns (proven AI Agents 247 ads):\n${referenceAds.map((ref, i) => 
          `${i + 1}. Tone: ${ref.tone_profile} | Performance: ${ref.performance_score}/100\nScript: ${ref.script?.substring(0, 200)}...`
        ).join('\n')}`
      : "";

    // Step 1: Enhanced AI Virality Scoring with Commercial DNA Analysis + Content Type Classification
    const scoringPrompt = `Rate the viral potential and commercial DNA of this video for cloning and adapting to promote AI Agents 247 (aiagents247.ca).

Video Details:
Title: ${trend.title}
Platform: ${trend.platform}
Views: ${trend.views || 0}
Likes: ${trend.likes || 0}
Comments: ${trend.comments || 0}
Category: ${trend.category}
Is Advertisement: ${trend.is_ad ? 'Yes' : 'No'}
Duration: ${trend.duration_seconds || 'Unknown'}s
Hook: ${trend.hook_text || 'Not available'}
Transcript: ${trend.transcript || 'Not available'}
${referenceContext}

Target Product: AI Agents 247 - AI-powered business automation agents available 24/7

COMMERCIAL DNA CRITERIA (critical for replication):
✅ Direct-to-camera spoken testimonial or UGC style (not cinematic)
✅ Simple setup: 1-2 actors, clear single benefit
✅ Emotion or transformation (before/after, problem/solution)
✅ Authentic, low-budget feel (NOT movie-style production)
✅ Clear hook within first 3 seconds
🚫 Complex cinematography or multiple locations
🚫 Celebrity endorsements requiring high production value

CONTENT TYPE CLASSIFICATION:
- category: "short_form" (≤60s) or "long_form" (>60s)
- ad_type: "ugc" (user testimonial), "superbowl" (emotional storytelling), "educational" (how-to/tips), "motivational" (inspiration/mindset), "informational" (facts/stats)

NEW SCORING METRICS (0-100):
- emotional_depth: How emotionally resonant is the content? (warmth, joy, sadness, triumph)
- informational_value: How much educational/actionable value does it provide?
- transformation_score: Does it show clear before/after or problem/solution transformation?

Score the video on these metrics (0-100):
1. clone_score - How easily can we recreate this with simple resources?
2. virality_score - Based on engagement metrics, how viral is this content?
3. product_fit_score - How well can this be adapted to promote AI agents?
4. clone_match_percent - How well does this match our proven ad DNA structure?
5. commercial_dna_score - Does this follow UGC/testimonial/simple ad format? (weight heavily)
6. replication_feasibility - Can we replicate this with 1 actor, simple backdrop, direct camera?
7. emotional_depth - Emotional resonance and connection
8. informational_value - Educational/actionable content value
9. transformation_score - Before/after or problem/solution clarity
10. overall_score - Weighted average: (commercial_dna_score * 0.3 + clone_score * 0.25 + virality_score * 0.2 + product_fit_score * 0.15 + clone_match_percent * 0.1)

Return ONLY valid JSON in this exact format:
{
  "clone_score": <number>,
  "virality_score": <number>,
  "product_fit_score": <number>,
  "clone_match_percent": <number>,
  "commercial_dna_score": <number>,
  "replication_feasibility": <number>,
  "emotional_depth": <number>,
  "informational_value": <number>,
  "transformation_score": <number>,
  "overall_score": <number>,
  "category": "<short_form|long_form>",
  "ad_type": "<ugc|superbowl|educational|motivational|informational>",
  "reasoning": "<brief explanation focusing on commercial DNA match>",
  "dna_match_details": "<specific notes on UGC style, setup simplicity, emotion type>"
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const scoringResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a viral content analysis expert. Always return valid JSON only." },
          { role: "user", content: scoringPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!scoringResponse.ok) {
      throw new Error(`AI scoring failed: ${scoringResponse.status}`);
    }

    const scoringData = await scoringResponse.json();
    const scoresText = scoringData.choices?.[0]?.message?.content || "{}";
    const scores = JSON.parse(scoresText);

    console.log(`📊 Scores:`, scores);

    // Detect Shock + Warmth triggers
    const shockTriggers = ["unexpected", "scream", "surprise", "wow", "fail", "caught", "shock", "sudden", "reaction", "gasp", "omg", "unbelievable"];
    const warmthTriggers = ["baby", "dog", "cat", "puppy", "kitten", "laughing", "hug", "smile", "crying", "family", "kindness", "love", "cute", "adorable", "heartwarming"];

    const titleLower = trend.title?.toLowerCase() || "";
    const transcriptLower = trend.transcript?.toLowerCase() || "";
    const combinedText = `${titleLower} ${transcriptLower}`;

    const shockCount = shockTriggers.filter(t => combinedText.includes(t)).length;
    const warmthCount = warmthTriggers.filter(t => combinedText.includes(t)).length;

    const shockScore = shockCount > 0 ? Math.min(70 + (shockCount * 10), 100) : 0;
    const warmthScore = warmthCount > 0 ? Math.min(60 + (warmthCount * 15), 100) : 0;
    const shareabilityScore = Math.round((shockScore * 0.6) + (warmthScore * 0.4));
    const shockWarmthRatio = warmthScore > 0 ? Math.round((shockScore / warmthScore) * 100) / 100 : shockScore;

    console.log(`🔥 Shock: ${shockScore} | 💖 Warmth: ${warmthScore} | 🌀 Shareability: ${shareabilityScore}`);

    // Recalculate overall score with shareability
    const enhancedOverallScore = Math.round(
      (scores.clone_score || 0) * 0.25 +
      (scores.virality_score || 0) * 0.25 +
      (scores.product_fit_score || 0) * 0.15 +
      (scores.commercial_dna_score || 0) * 0.15 +
      shareabilityScore * 0.20
    );

    // Save enhanced viral scores with new content type fields
    const { error: scoreError } = await supabase
      .from("viral_scores")
      .upsert({
        trend_id,
        clone_score: scores.clone_score || 0,
        virality_score: scores.virality_score || 0,
        product_fit_score: scores.product_fit_score || 0,
        clone_match_percent: scores.clone_match_percent || 0,
        commercial_dna_score: scores.commercial_dna_score || 0,
        replication_feasibility: scores.replication_feasibility || 0,
        shock_score: shockScore,
        warmth_score: warmthScore,
        shareability_score: shareabilityScore,
        shock_warmth_ratio: shockWarmthRatio,
        overall_score: enhancedOverallScore,
        ai_reasoning: scores.reasoning || "",
        category: scores.category || (trend.duration_seconds <= 60 ? 'short_form' : 'long_form'),
        ad_type: scores.ad_type || 'ugc',
        emotional_depth: scores.emotional_depth || 0,
        informational_value: scores.informational_value || 0,
        transformation_score: scores.transformation_score || 0,
      });

    if (scoreError) {
      console.error("Failed to save scores:", scoreError);
    }

    console.log(`📊 DNA Match: ${scores.commercial_dna_score}/100 | Overall: ${enhancedOverallScore}/100 | 🌀 Share: ${shareabilityScore}/100`);

    // Step 2: Super Bowl Tone Selection & Multi-Tone Script Adaptation
    let adaptedScripts: any = null;
    let bestTone = 'professional';
    let cinematicStructure = null;

    // Choose Super Bowl tone based on emotional signals
    function chooseSuperTone(video: any, shockScore: number, warmthScore: number) {
      const transcript = video.transcript?.toLowerCase() || "";
      const title = video.title?.toLowerCase() || "";
      const combinedText = `${transcript} ${title}`;

      // Humorous signals
      if (combinedText.includes("laugh") || combinedText.includes("funny") || 
          combinedText.includes("joke") || combinedText.includes("comedy") || shockScore > 70) {
        return "humorous";
      }
      
      // Emotional signals
      if (combinedText.includes("heart") || combinedText.includes("love") || 
          combinedText.includes("story") || combinedText.includes("family") || 
          warmthScore > 70) {
        return "emotional";
      }
      
      // Default to heroic/professional
      return "heroic";
    }

    const superTone = chooseSuperTone(trend, shockScore, warmthScore);
    
    // Generate cinematic structure
    cinematicStructure = {
      intro: "Quick pattern interrupt or surprise visual",
      setup: "Relatable business problem or pain point",
      payoff: "AI Agents 247 transformation moment",
      emotionalHook: superTone === "emotional" ? "Touch of human empathy or personal win" : null,
      humorBeat: superTone === "humorous" ? "Unexpected visual joke or clever twist" : null,
      heroicCTA: superTone === "heroic" ? "Big confident statement, cinematic close" : null,
      recommendedTone: superTone
    };

    console.log(`🎭 Super Bowl Tone: ${superTone.toUpperCase()}`);

    if (scores.commercial_dna_score > 60) {
      const adaptationPrompt = `Adapt this viral ad into THREE Super Bowl-caliber tone variants for AI Agents 247 (aiagents247.ca).

Original Video:
Title: ${trend.title}
Platform: ${trend.platform}
Hook: ${trend.hook_text || 'Not available'}
Transcript: ${trend.transcript || 'Not available'}
Commercial DNA: ${scores.dna_match_details || 'UGC/testimonial style'}
Emotional Profile: Shock ${shockScore}/100 | Warmth ${warmthScore}/100 | Shareability ${shareabilityScore}/100

Product: AI Agents 247
- AI-powered business automation agents
- Available 24/7 to handle repetitive business tasks
- Saves time, reduces errors, increases efficiency
- Website: aiagents247.ca

Create 3 SUPER BOWL-QUALITY variants maintaining the EXACT viral structure but different emotional tones:

VARIANT A - HUMOROUS 😂:
- Use wit, surprise visual reversals, unexpected moments
- Keep problem/solution but make it memorable and funny
- Think: Dollar Shave Club meets Old Spice energy
- Example angle: "Me pretending to be productive while my AI agent actually crushes my to-do list"
- Cinematic Structure:
  * 0-3s: Visual surprise or pattern interrupt
  * 4-8s: Relatable problem (exaggerated for comedy)
  * 9-15s: AI Agents 247 swoops in with unexpected solution
  * 16-25s: Humorous payoff beat showing transformation
  * CTA: "Try AI Agents 247.ca"

VARIANT B - EMOTIONAL 💖:
- Focus on transformation, relief, human empowerment
- Use before/after emotional contrast with warmth
- Think: Dove Real Beauty meets Google Reunion emotional storytelling
- Example angle: "I used to miss my kid's bedtime. Now my AI handles follow-ups while I'm home by 6."
- Cinematic Structure:
  * 0-3s: Warm opening showing human struggle
  * 4-8s: Emotional setup of the cost (time, stress, family)
  * 9-15s: AI Agents 247 as gentle helper
  * 16-25s: Emotional payoff - real human moment regained
  * CTA: "Try AI Agents 247.ca"

VARIANT C - HEROIC 🏆:
- Direct, powerful, authority-building with cinematic confidence
- Use data points, clear transformation, aspirational energy
- Think: Apple "Think Different" meets Nike "Just Do It" boldness
- Example angle: "3,000 tasks automated. 40 hours reclaimed. One fearless choice."
- Cinematic Structure:
  * 0-3s: Bold visual statement
  * 4-8s: High-stakes problem framing
  * 9-15s: AI Agents 247 as the ultimate solution
  * 16-25s: Aspirational close showing victory/achievement
  * CTA: "Try AI Agents 247.ca"

For each variant:
- Keep it 30-45 seconds max (Super Bowl pacing)
- Start with a 3-second cinematic hook
- Include CLEAR visual directions for Veo 3.1 rendering
- Make it feel AUTHENTIC yet PREMIUM (not overproduced)
- End with strong CTA: "Try AI Agents 247.ca"

Return ONLY valid JSON:
{
  "humorous": {
    "script": "<full 30-45s script with visual cues>",
    "hook": "<3-second opening visual hook>",
    "cta": "<call to action>",
    "predicted_virality": <0-100>,
    "tone_notes": "<why this humorous angle works>",
    "veo_prompt": "<specific visual directions for Veo 3.1>"
  },
  "emotional": {
    "script": "<full 30-45s script with visual cues>",
    "hook": "<3-second opening visual hook>",
    "cta": "<call to action>",
    "predicted_virality": <0-100>,
    "tone_notes": "<why this emotional angle works>",
    "veo_prompt": "<specific visual directions for Veo 3.1>"
  },
  "heroic": {
    "script": "<full 30-45s script with visual cues>",
    "hook": "<3-second opening visual hook>",
    "cta": "<call to action>",
    "predicted_virality": <0-100>,
    "tone_notes": "<why this heroic angle works>",
    "veo_prompt": "<specific visual directions for Veo 3.1>"
  },
  "recommended_tone": "<humorous|emotional|heroic>",
  "reasoning": "<which tone best matches viral DNA and Super Bowl quality>"
}`;

      const adaptationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an expert Super Bowl commercial director and viral video scriptwriter. Always return valid JSON only." },
            { role: "user", content: adaptationPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (adaptationResponse.ok) {
        const adaptationData = await adaptationResponse.json();
        const adaptationText = adaptationData.choices?.[0]?.message?.content || "{}";
        adaptedScripts = JSON.parse(adaptationText);
        bestTone = adaptedScripts.recommended_tone || superTone;

        console.log(`📝 Super Bowl scripts generated. Recommended: ${bestTone.toUpperCase()}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trend_id,
        scores: {
          clone_score: scores.clone_score,
          virality_score: scores.virality_score,
          product_fit_score: scores.product_fit_score,
          clone_match_percent: scores.clone_match_percent,
          commercial_dna_score: scores.commercial_dna_score,
          replication_feasibility: scores.replication_feasibility,
          shock_score: shockScore,
          warmth_score: warmthScore,
          shareability_score: shareabilityScore,
          shock_warmth_ratio: shockWarmthRatio,
          overall_score: enhancedOverallScore,
        },
        adapted_scripts: adaptedScripts,
        recommended_tone: bestTone,
        super_tone: superTone,
        cinematic_structure: cinematicStructure,
        auto_approve: scores.commercial_dna_score > 75 && enhancedOverallScore > 70,
        is_share_magnet: shareabilityScore > 80,
        super_bowl_ready: enhancedOverallScore > 75 && shareabilityScore > 75,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in ai-score-and-adapt:", error);
    return new Response(JSON.stringify({ error: `${error}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
