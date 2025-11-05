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
    console.log("🚀 Auto-posting best performing variants...");

    // Get all selected variants ready for posting
    const { data: selectedVariants, error: fetchError } = await supabase
      .from("video_jobs")
      .select("*")
      .eq("selected_variant", true)
      .eq("status", "ready_for_posting");

    if (fetchError) throw fetchError;

    if (!selectedVariants || selectedVariants.length === 0) {
      return new Response(
        JSON.stringify({ message: "No variants ready for posting", posted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📊 Found ${selectedVariants.length} winning variants to post`);

    const platforms = ["tiktok", "youtube_shorts", "instagram", "facebook"];
    let totalPosts = 0;

    for (const variant of selectedVariants) {
      if (!variant.final_url) {
        console.log(`⚠️ Variant ${variant.id} has no final_url, skipping`);
        continue;
      }

      const variantGroupId = variant.variant_group_id || variant.id;

      // Create publish queue entries for each platform
      for (const platform of platforms) {
        // Calculate scheduled time (stagger posts every 3 hours)
        const baseTime = new Date();
        baseTime.setHours(baseTime.getHours() + 1); // Start 1 hour from now
        const platformDelay = platforms.indexOf(platform) * 3; // 3 hours apart
        const scheduledTime = new Date(baseTime.getTime() + (platformDelay * 60 * 60 * 1000));

        const { error: publishError } = await supabase
          .from("publish_queue")
          .insert({
            org_id: variant.org_id,
            video_job_id: variant.id,
            platform: platform,
            status: "scheduled",
            scheduled_time: scheduledTime.toISOString(),
            caption: generateCaption(variant, platform),
            target_vertical: variant.target_vertical || "general",
            brand_label: variant.brand_label,
          });

        if (publishError) {
          console.error(`❌ Failed to queue ${platform} for variant ${variant.id}:`, publishError);
        } else {
          totalPosts++;
          console.log(`✅ Queued ${platform} for ${scheduledTime.toLocaleString()}`);
        }
      }

      // Update variant status to posted
      await supabase
        .from("video_jobs")
        .update({ 
          status: "posted",
          autopilot_snapshot: true 
        })
        .eq("id", variant.id);

      // Log to replication history
      await supabase
        .from("replication_history")
        .insert({
          org_id: variant.org_id,
          source_video_url: variant.trend_id ? `Viral trend clone` : "Generated",
          platform: "multi-platform",
          remake_job_id: variant.id,
          status: "scheduled",
          scheduled_time: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        });
    }

    console.log(`🎉 Successfully queued ${totalPosts} posts across all platforms`);

    return new Response(
      JSON.stringify({
        success: true,
        variants_posted: selectedVariants.length,
        total_posts: totalPosts,
        platforms: platforms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in post-best-variant:", error);
    return new Response(JSON.stringify({ error: `${error}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generateCaption(variant: any, platform: string): string {
  const baseCaptions = {
    humorous: "When AI does your work while you scroll 😂 #AIAutomation #BusinessHacks #TimeBack",
    emotional: "Finally home for dinner. Thanks to AI handling the busywork 💙 #WorkLifeBalance #AIHelp",
    heroic: "3,000 tasks automated. 40 hours saved. One decision. 🚀 #Productivity #AIAgents247",
  };

  const tone = variant.super_tone || "heroic";
  let caption = baseCaptions[tone as keyof typeof baseCaptions] || baseCaptions.heroic;

  // Platform-specific hashtags
  if (platform === "tiktok") {
    caption += " #TikTokBusiness #SmallBizTips";
  } else if (platform === "instagram") {
    caption += " #InstaEntrepreneur #BusinessGrowth";
  } else if (platform === "youtube_shorts") {
    caption += " #Shorts #BusinessTips";
  } else if (platform === "facebook") {
    caption += " #SmallBusiness #Entrepreneur";
  }

  caption += "\n\nTry AI Agents 247.ca";

  return caption;
}
