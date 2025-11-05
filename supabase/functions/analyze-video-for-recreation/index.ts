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
    const { video_id } = await req.json();
    
    if (!video_id) {
      return new Response(JSON.stringify({ error: "video_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔍 Analyzing video for recreation: ${video_id}`);

    // Get the video details
    const { data: video, error: videoError } = await supabase
      .from("trends")
      .select("*")
      .eq("id", video_id)
      .single();

    if (videoError || !video) {
      return new Response(JSON.stringify({ error: "Video not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract video ID from URL for YouTube
    let youtubeVideoId = null;
    if (video.platform === "youtube" && video.source_video_url) {
      const match = video.source_video_url.match(/embed\/([^?]+)/);
      if (match) youtubeVideoId = match[1];
    }

    let relatedVideos: any[] = [];

    // Fetch related videos from YouTube API
    if (youtubeVideoId) {
      const apiKey = Deno.env.get("YOUTUBE_API_KEY");
      if (apiKey) {
        try {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${youtubeVideoId}&type=video&videoDuration=short&maxResults=5&key=${apiKey}`;
          const searchRes = await fetch(searchUrl);
          
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const videoIds = (searchData.items || []).map((item: any) => item.id.videoId).join(',');
            
            if (videoIds) {
              const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
              const statsRes = await fetch(statsUrl);
              
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                relatedVideos = (statsData.items || []).map((v: any) => ({
                  platform: "youtube",
                  source_video_url: `https://www.youtube.com/embed/${v.id}`,
                  title: v.snippet?.title || "Related Video",
                  thumbnail_url: v.snippet?.thumbnails?.medium?.url || "",
                  views: parseInt(v.statistics.viewCount || "0"),
                  likes: parseInt(v.statistics.likeCount || "0"),
                  comments: parseInt(v.statistics.commentCount || "0"),
                  category: "GENERAL",
                }));
              }
            }
          }
        } catch (e) {
          console.error("Error fetching related videos from YouTube:", e);
        }
      }
    }

    // If no YouTube related videos, find similar by title keywords
    if (relatedVideos.length === 0) {
      const titleWords = video.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 4); // Only meaningful words

      if (titleWords.length > 0) {
        const { data: similarVideos } = await supabase
          .from("trends")
          .select("*")
          .neq("id", video_id)
          .eq("platform", video.platform)
          .gte("views", video.views * 0.3) // At least 30% of original views
          .limit(5);

        relatedVideos = (similarVideos || []).filter((v: any) => {
          const vTitleLower = v.title.toLowerCase();
          return titleWords.some((word: string) => vTitleLower.includes(word));
        });
      }
    }

    // Store related videos in database
    for (const relatedVideo of relatedVideos) {
      // First ensure the related video exists in trends table
      const { data: existingTrend } = await supabase
        .from("trends")
        .select("id")
        .eq("source_video_url", relatedVideo.source_video_url)
        .single();

      let relatedTrendId = existingTrend?.id;

      if (!relatedTrendId) {
        // Insert if doesn't exist
        const { data: newTrend } = await supabase
          .from("trends")
          .insert({
            platform: relatedVideo.platform,
            source_video_url: relatedVideo.source_video_url,
            title: relatedVideo.title,
            thumbnail_url: relatedVideo.thumbnail_url,
            views: relatedVideo.views,
            likes: relatedVideo.likes,
            comments: relatedVideo.comments,
            category: relatedVideo.category,
          })
          .select("id")
          .single();

        relatedTrendId = newTrend?.id;
      }

      if (relatedTrendId) {
        // Link the videos
        await supabase.from("related_trends").upsert({
          video_id: video_id,
          related_video_id: relatedTrendId,
          reason: "Similar viral pattern",
          similarity_score: 75,
        });
      }
    }

    console.log(`✅ Found ${relatedVideos.length} related videos`);

    return new Response(
      JSON.stringify({
        success: true,
        video: video,
        related_count: relatedVideos.length,
        related_videos: relatedVideos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in analyze-video-for-recreation:", error);
    return new Response(JSON.stringify({ error: `${error}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
