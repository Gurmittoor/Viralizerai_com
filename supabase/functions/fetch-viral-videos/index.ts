// Supabase Edge Function: fetch-viral-videos
// Fetches latest viral/trending videos and filters out already-cloned sources

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ViralVideo {
  url: string
  video_id: string
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter'
  title: string
  author: string
  views: number
  likes: number
  engagement_score: number
  thumbnail_url?: string
  duration?: number
  posted_at?: string
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

    const { org_id, platforms = ['youtube'], limit = 20, category } = await req.json()

    console.log(`🔍 Fetching viral videos for org: ${org_id}`)

    const allViralVideos: ViralVideo[] = []

    if (platforms.includes('youtube')) {
      const ytVideos = await fetchYouTubeVirals(category, limit)
      allViralVideos.push(...ytVideos)
    }

    console.log(`📊 Found ${allViralVideos.length} viral videos`)

    // Filter out already-cloned sources
    const sourceUrls = allViralVideos.map(v => v.url)
    
    const { data: unclonedUrls, error: filterError } = await supabase
      .rpc('filter_uncloned_sources', {
        p_source_urls: sourceUrls,
        p_org_id: org_id
      })

    if (filterError) {
      console.error('Error filtering cloned sources:', filterError)
      throw filterError
    }

    const unclonedVideos = allViralVideos.filter(video => 
      unclonedUrls.includes(video.url)
    )

    const skippedCount = allViralVideos.length - unclonedVideos.length

    console.log(`✅ ${unclonedVideos.length} new videos (skipped ${skippedCount} duplicates)`)

    unclonedVideos.sort((a, b) => b.engagement_score - a.engagement_score)
    const topVideos = unclonedVideos.slice(0, limit)

    return new Response(
      JSON.stringify({
        success: true,
        videos: topVideos,
        stats: {
          total_found: allViralVideos.length,
          duplicates_skipped: skippedCount,
          new_videos: unclonedVideos.length,
          returned: topVideos.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error fetching viral videos:', error)
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

async function fetchYouTubeVirals(category: string | undefined, limit: number): Promise<ViralVideo[]> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY')
  if (!apiKey) {
    console.warn('⚠️ YOUTUBE_API_KEY not set, skipping YouTube')
    return []
  }

  try {
    const categoryParam = category ? `&videoCategoryId=${getCategoryId(category)}` : ''
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=${limit}${categoryParam}&regionCode=US&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.items.map((item: any) => ({
      url: `https://www.youtube.com/watch?v=${item.id}`,
      video_id: item.id,
      platform: 'youtube' as const,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      views: parseInt(item.statistics.viewCount || '0'),
      likes: parseInt(item.statistics.likeCount || '0'),
      engagement_score: calculateEngagement(
        parseInt(item.statistics.viewCount || '0'),
        parseInt(item.statistics.likeCount || '0'),
        parseInt(item.statistics.commentCount || '0')
      ),
      thumbnail_url: item.snippet.thumbnails.high.url,
      duration: parseDuration(item.contentDetails.duration),
      posted_at: item.snippet.publishedAt
    }))
  } catch (error) {
    console.error('YouTube fetch error:', error)
    return []
  }
}

function calculateEngagement(views: number, likes: number, comments: number): number {
  if (views === 0) return 0
  const likeWeight = 1.0
  const commentWeight = 2.0
  return ((likes * likeWeight + comments * commentWeight) / views) * 100
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return 0
  const hours = parseInt(match[1]?.replace('H', '') || '0')
  const minutes = parseInt(match[2]?.replace('M', '') || '0')
  const seconds = parseInt(match[3]?.replace('S', '') || '0')
  return hours * 3600 + minutes * 60 + seconds
}

function getCategoryId(category: string): string {
  const categories: Record<string, string> = {
    'business': '28',
    'tech': '28',
    'education': '27',
    'howto': '26',
    'entertainment': '24',
    'news': '25',
    'sports': '17',
    'gaming': '20'
  }
  return categories[category.toLowerCase()] || '28'
}
