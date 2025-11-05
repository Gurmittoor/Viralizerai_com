import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoData {
  platform: string;
  video_url: string;
  title: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  category: string;
  embed_html: string | null;
  duration_seconds?: number;
  clone_ready?: boolean;
  clone_score?: number;
  spoken_content?: boolean;
  detected_language?: string;
  is_ad?: boolean;
}

/* Helper to calculate clone readiness score */
function calculateCloneScore(video: VideoData): { ready: boolean; score: number; spoken: boolean; language: string; isAd: boolean } {
  let score = 0;
  let spokenContent = false;
  let language = 'unknown';
  let isAd = false;
  
  const title = video.title.toLowerCase();
  
  // Filter out political content (return score of 0 to exclude)
  const politicalKeywords = ['trump', 'biden', 'tariff', 'politics', 'political', 'election', 'vote', 'campaign', 'republican', 'democrat', 'congress', 'senate', 'president', 'government', 'policy', 'liberal', 'conservative', 'reagan'];
  const isPolitical = politicalKeywords.some(kw => title.includes(kw));
  if (isPolitical) {
    return {
      ready: false,
      score: 0,
      spoken: false,
      language: 'unknown',
      isAd: false
    };
  }
  
  // Detect if it's an advertisement
  const adKeywords = ['commercial', 'ad', 'advertisement', 'promo', 'super bowl', 'brand'];
  isAd = adKeywords.some(kw => title.includes(kw));
  if (isAd) score += 40; // Massive boost for ads
  
  // Detect language (prioritize English)
  const hasEnglishChars = /[a-zA-Z]/.test(title);
  const hasNonEnglishChars = /[^\x00-\x7F]/.test(title);
  
  if (hasEnglishChars && !hasNonEnglishChars) {
    language = 'english';
    score += 30; // Boost for English content
  } else if (hasEnglishChars) {
    language = 'mixed';
    score += 10;
  } else {
    language = 'non-english';
    score -= 30; // Heavy penalty for non-English
  }
  
  // Check for spoken content indicators
  const spokenKeywords = ['explains', 'reacts', 'reveals', 'says', 'talks', 'discusses', 'shares', 'advice', 'tips', 'how to', 'tutorial', 'review', 'breakdown'];
  spokenContent = spokenKeywords.some(kw => title.includes(kw));
  if (spokenContent) score += 20;
  
  // Duration check (prefer shorts under 70s)
  const duration = video.duration_seconds || 60;
  if (duration < 70) {
    score += 20;
  } else if (duration < 90) {
    score += 10;
  }
  
  // Visual pattern detection (keywords suggesting face-to-camera or product demo)
  const visualKeywords = ['funny', 'emotional', 'creative', 'viral', 'trending', 'best'];
  if (visualKeywords.some(kw => title.includes(kw))) score += 15;
  
  return {
    ready: score >= 60,
    score: Math.min(100, Math.max(0, score)), // Cap between 0-100
    spoken: spokenContent,
    language,
    isAd
  };
}

/* --------------------------- YouTube Shorts --------------------------- */
async function fetchYouTubeShorts(): Promise<VideoData[]> {
  try {
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) return [];

    // Search for viral commercial ads and promotional content
    const searchTerms = [
      'viral commercial ad',
      'funny commercial',
      'super bowl commercial',
      'brand ad campaign',
      'viral product commercial',
      'best commercials',
      'advertisement viral',
      'tv commercial viral',
      'marketing campaign ad'
    ];
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const publishedAfter = fourteenDaysAgo.toISOString();
    
    const allVideos: VideoData[] = [];
    
    // Search North American regions (US + Canada)
    const regions = ['US', 'CA'];
    
    for (const region of regions) {
      // Search a subset of terms per region to save quota
      const termsToSearch = region === 'US' ? searchTerms.slice(0, 2) : searchTerms.slice(2, 3);
      
      for (const term of termsToSearch) {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&videoDuration=short&order=viewCount&maxResults=15&publishedAfter=${publishedAfter}&regionCode=${region}&relevanceLanguage=en&key=${apiKey}`;
        
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) continue;
        
        const searchData = await searchRes.json();
        const videoIds = (searchData.items || []).map((item: any) => item.id.videoId).join(',');
        
        if (!videoIds) continue;
      
        // Get detailed stats for these videos
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl);
        if (!statsRes.ok) continue;
        
        const statsData = await statsRes.json();
        const videos = (statsData.items || [])
          .map((v: any) => {
            // Parse duration
            const durationMatch = v.contentDetails?.duration?.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
            const minutes = parseInt(durationMatch?.[1] || "0");
            const seconds = parseInt(durationMatch?.[2] || "0");
            const totalSeconds = minutes * 60 + seconds;
            
            const videoData: VideoData = {
              platform: "youtube",
              video_url: `https://www.youtube.com/embed/${v.id}`,
              title: v.snippet?.title || "YouTube Short",
              thumbnail_url: v.snippet?.thumbnails?.medium?.url || "",
              view_count: parseInt(v.statistics.viewCount || "0"),
              like_count: parseInt(v.statistics.likeCount || "0"),
              comment_count: parseInt(v.statistics.commentCount || "0"),
              category: "GENERAL",
              embed_html: null,
              duration_seconds: totalSeconds,
            };
            
            const cloneData = calculateCloneScore(videoData);
            videoData.clone_ready = cloneData.ready;
            videoData.clone_score = cloneData.score;
            videoData.spoken_content = cloneData.spoken;
            videoData.detected_language = cloneData.language;
            videoData.is_ad = cloneData.isAd;
            videoData.category = cloneData.isAd ? 'VIRAL_AD' : 'GENERAL';
            
            return videoData;
          })
          // Only include English-language videos
          .filter((v: VideoData) => v.detected_language === 'english')
          // Prioritize ads
          .sort((a: VideoData, b: VideoData) => (b.is_ad ? 1 : 0) - (a.is_ad ? 1 : 0));
        
        allVideos.push(...videos);
      }
    }
    
    // Sort by view count and take top 10
    const sorted = allVideos
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 10);

    console.log(`YouTube business videos found: ${sorted.length}`);
    return sorted;
  } catch (e) {
    console.error("YouTube error", e);
    return [];
  }
}

/* --------------------------- TikTok Trending --------------------------- */
async function fetchTikTokTrending(): Promise<VideoData[]> {
  try {
    const rapidKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidKey) return [];

    const res = await fetch("https://tiktok-download-video1.p.rapidapi.com/feed/trending", {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "tiktok-download-video1.p.rapidapi.com",
      },
    });

    if (!res.ok) {
      console.error("TikTok API error:", res.status);
      return [];
    }

    const data = await res.json();
    const allResults = await Promise.all(
      (data.data || []).slice(0, 50).map(async (v: any) => {
        const videoUrl = v.url || v.video_url || "";
        let embedHtml = null;
        
        // Try to get TikTok oEmbed HTML
        try {
          const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`);
          if (oembedRes.ok) {
            const oembed = await oembedRes.json();
            embedHtml = oembed.html || null;
          }
        } catch (e) {
          console.log("TikTok oEmbed failed for:", videoUrl);
        }

        return {
          platform: "tiktok",
          video_url: videoUrl,
          embed_html: embedHtml,
          title: v.title || v.desc || "TikTok Video",
          thumbnail_url: v.cover || v.dynamicCover || "",
          view_count: v.playCount || 0,
          like_count: v.diggCount || 0,
          comment_count: v.commentCount || 0,
          category: "GENERAL",
        };
      })
    );

    // Tiered fallback: prefer 1M+ views, fallback to 200K+ if needed
    let videos = allResults.filter((v: VideoData) => v.view_count > 1_000_000).slice(0, 10);
    
    if (videos.length < 10) {
      const fallback = allResults.filter((v: VideoData) => v.view_count > 200_000).slice(0, 10 - videos.length);
      videos = [...videos, ...fallback];
    }

    console.log(`TikTok videos found: ${videos.length}`);
    return videos;
  } catch (e) {
    console.error("TikTok fetch error:", e);
    return [];
  }
}

/* --------------------------- Instagram Reels --------------------------- */
async function fetchInstagramReels(): Promise<VideoData[]> {
  try {
    const rapidKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidKey) return [];

    const res = await fetch("https://instagram-scraper-api2.p.rapidapi.com/v1/explore?reels_only=true", {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com",
      },
    });
    if (!res.ok) {
      console.error("Instagram API error:", res.status);
      return [];
    }

    const data = await res.json();
    return (data.items || [])
      .filter((v: any) => (v.play_count || 0) > 500_000)
      .slice(0, 10)
      .map((v: any) => ({
        platform: "instagram",
        video_url: `https://www.instagram.com/reel/${v.code}/`,
        title: v.caption?.text || "Instagram Reel",
        thumbnail_url: v.thumbnail_url || v.display_url || "",
        view_count: v.play_count || 0,
        like_count: v.like_count || 0,
        comment_count: v.comment_count || 0,
        category: "GENERAL",
        embed_html: null,
      }));
  } catch (e) {
    console.error("Instagram fetch error:", e);
    return [];
  }
}

/* --------------------------- Facebook Reels --------------------------- */
async function fetchFacebookReels(): Promise<VideoData[]> {
  try {
    const rapidKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidKey) return [];

    const res = await fetch("https://facebook-reels-trending.p.rapidapi.com/trending", {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "facebook-reels-trending.p.rapidapi.com",
      },
    });
    if (!res.ok) {
      console.error("Facebook API error:", res.status);
      return [];
    }

    const data = await res.json();
    return (data.data || [])
      .filter((v: any) => (v.views || 0) > 1_000_000)
      .slice(0, 10)
      .map((v: any) => ({
        platform: "facebook",
        video_url: v.url || "",
        title: v.caption || "Facebook Reel",
        thumbnail_url: v.thumbnail || "",
        view_count: v.views || 0,
        like_count: v.likes || 0,
        comment_count: v.comments || 0,
        category: "GENERAL",
        embed_html: null,
      }));
  } catch (e) {
    console.error("Facebook fetch error:", e);
    return [];
  }
}

/* --------------------------- X (Twitter) Trending --------------------------- */
async function fetchXTrending(): Promise<VideoData[]> {
  try {
    const rapidKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidKey) return [];

    const res = await fetch("https://twitter-trending-feed.p.rapidapi.com/trending", {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "twitter-trending-feed.p.rapidapi.com",
      },
    });
    if (!res.ok) {
      console.error("X API error:", res.status);
      return [];
    }

    const data = await res.json();
    return (data.data || [])
      .filter((v: any) => (v.views || 0) > 500_000)
      .slice(0, 10)
      .map((v: any) => ({
        platform: "x",
        video_url: v.url || "",
        title: v.title || "X Viral Clip",
        thumbnail_url: v.thumbnail || "",
        view_count: v.views || 0,
        like_count: v.likes || 0,
        comment_count: v.retweets || 0,
        category: "GENERAL",
        embed_html: null,
      }));
  } catch (e) {
    console.error("X fetch error:", e);
    return [];
  }
}

/* --------------------------- Main Function --------------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    console.log("🟡 Fetching trending videos across platforms...");

    const [yt, tk, ig, fb, tw] = await Promise.allSettled([
      fetchYouTubeShorts(),
      fetchTikTokTrending(),
      fetchInstagramReels(),
      fetchFacebookReels(),
      fetchXTrending(),
    ]);

    const allVideos = [
      ...(yt.status === "fulfilled" ? yt.value : []),
      ...(tk.status === "fulfilled" ? tk.value : []),
      ...(ig.status === "fulfilled" ? ig.value : []),
      ...(fb.status === "fulfilled" ? fb.value : []),
      ...(tw.status === "fulfilled" ? tw.value : []),
    ];

    console.log(`✅ Total fetched: ${allVideos.length}`);

    let inserted = 0;

    for (const v of allVideos) {
      if (!v.video_url) continue;
      const { error } = await supabase.from("trends").upsert(
        {
          platform: v.platform,
          source_video_url: v.video_url,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          views: v.view_count,
          likes: v.like_count,
          comments: v.comment_count,
          category: v.category,
          embed_html: v.embed_html,
          duration_seconds: v.duration_seconds,
          clone_ready: v.clone_ready || false,
          clone_score: v.clone_score || 0,
          spoken_content: v.spoken_content || false,
          detected_language: v.detected_language || 'unknown',
          is_ad: v.is_ad || false,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "source_video_url" },
      );
      if (!error) inserted++;
      else console.error("DB upsert error:", error);
    }

    console.log(`✅ Inserted/updated: ${inserted}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: inserted,
        youtube: yt.status === "fulfilled" ? yt.value.length : 0,
        tiktok: tk.status === "fulfilled" ? tk.value.length : 0,
        instagram: ig.status === "fulfilled" ? ig.value.length : 0,
        facebook: fb.status === "fulfilled" ? fb.value.length : 0,
        x: tw.status === "fulfilled" ? tw.value.length : 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error in fetch-trending-urls:", error);
    return new Response(JSON.stringify({ error: `${error}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
