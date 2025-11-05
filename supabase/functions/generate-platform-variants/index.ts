import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlatformProfile {
  platform: string;
  hook_window_seconds: number;
  ideal_length_seconds: number;
  hashtag_strategy: {
    max: number;
    mix: string;
  };
  caption_style: string;
  visual_rules: {
    ratio: string;
    requires_subtitles: boolean;
    looping: boolean;
  };
  audio_rules: {
    use_trending_sound: boolean;
    allow_music: boolean;
  };
  engagement_triggers: {
    cta_type: string;
    emotion_curve: string;
  };
}

interface VideoJob {
  id: string;
  org_id: string;
  final_url: string | null;
  transcript: string | null;
  target_vertical: string | null;
  brand_label: string | null;
  post_targets: string[];
  organizations?: {
    brand_domain: string | null;
    cta_voice_line: string | null;
    requires_manual_review_before_post: boolean;
    default_post_time: string | null;
  };
}

interface PlatformMetadata {
  caption: string;
  hashtags: string[];
  engagement_prediction: number;
  thumbnail_url: string | null;
}

// Generate platform-specific caption based on profile style with white-label CTA
function generateCaption(
  transcript: string | null,
  profile: PlatformProfile,
  brandLabel: string | null,
  vertical: string | null,
  brandDomain: string,
  ctaVoiceLine: string
): string {
  const base = transcript?.substring(0, 80) || `Check out this ${vertical || 'amazing'} video!`;
  let caption = '';
  
  switch (profile.caption_style) {
    case 'comment_bait':
      caption = `No one talks about this... ${base} 👀 What do you think?`;
      break;
    case 'keyword_dense':
      caption = `${brandLabel || 'Our'} ${vertical || 'service'}: ${base}`;
      break;
    case 'story_tease':
      caption = `Here's what happened... ${base} 💫`;
      break;
    case 'direct_offer':
      caption = `${brandLabel || 'We'} can help with ${vertical || 'your needs'}. ${base}`;
      break;
    default:
      caption = base;
  }
  
  // Append org's white-label CTA and domain
  return `${caption} | ${ctaVoiceLine} | ${brandDomain}`;
}

// Generate hashtags based on platform strategy
function generateHashtags(
  profile: PlatformProfile,
  vertical: string | null,
  brandLabel: string | null
): string[] {
  const maxTags = profile.hashtag_strategy.max;
  const tags: string[] = [];
  
  // Add vertical-based tags
  if (vertical) {
    tags.push(`#${vertical.replace(/\s+/g, '').toLowerCase()}`);
  }
  
  // Add brand tag if available
  if (brandLabel) {
    tags.push(`#${brandLabel.replace(/\s+/g, '').toLowerCase()}`);
  }
  
  // Add platform-specific trending tags based on platform
  switch (profile.platform) {
    case 'tiktok':
      tags.push('#fyp', '#viral', '#foryou');
      break;
    case 'youtube_shorts':
      tags.push('#shorts', '#youtube');
      break;
    case 'instagram_reels':
      tags.push('#reels', '#trending', '#explore');
      break;
    case 'facebook_reels':
      tags.push('#reels', '#viral');
      break;
  }
  
  return tags.slice(0, maxTags);
}

// Build platform-specific metadata
function buildPlatformVariantMetadata(
  job: VideoJob,
  profile: PlatformProfile
): PlatformMetadata {
  const brandDomain = job.organizations?.brand_domain || 'AIAgents247.ca';
  const ctaVoiceLine = job.organizations?.cta_voice_line || 'Try A-I Agents two-four-seven dot C-A';
  
  return {
    caption: generateCaption(job.transcript, profile, job.brand_label, job.target_vertical, brandDomain, ctaVoiceLine),
    hashtags: generateHashtags(profile, job.target_vertical, job.brand_label),
    engagement_prediction: Math.random() * 50 + 50, // Placeholder: 50-100 score
    thumbnail_url: null, // Will be generated later
  };
}

// Get scheduled time for org (use org default or 1 hour from now)
function getScheduledTime(defaultPostTime: string | null | undefined): string {
  if (defaultPostTime) {
    return defaultPostTime;
  }
  // Default: 1 hour from now
  const scheduled = new Date();
  scheduled.setHours(scheduled.getHours() + 1);
  return scheduled.toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { video_job_id } = await req.json();

    console.log('Generating platform variants for job:', video_job_id);

    // 1. Fetch video job with org settings for white-label and compliance
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .select('*, organizations(brand_domain, cta_voice_line, requires_manual_review_before_post, default_post_time)')
      .eq('id', video_job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Video job not found: ${jobError?.message}`);
    }

    const videoJob = job as VideoJob;

    // Safety check: must have final_url
    if (!videoJob.final_url) {
      return new Response(
        JSON.stringify({ error: 'Job not rendered yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targets = videoJob.post_targets || [];
    console.log('Target platforms:', targets);

    const results = [];

    for (const platform of targets) {
      console.log(`Processing platform: ${platform}`);

      // 2. Get platform virality profile
      const { data: profile, error: profileError } = await supabase
        .from('platform_virality_profiles')
        .select('*')
        .eq('platform', platform)
        .single();

      if (profileError || !profile) {
        console.error(`Platform profile not found for ${platform}:`, profileError);
        continue;
      }

      // 3. Build per-platform metadata
      const meta = buildPlatformVariantMetadata(videoJob, profile as PlatformProfile);

      // 4. Charge credits for this variant
      const { error: chargeError } = await supabase.rpc('charge_platform_variant', {
        _org_id: videoJob.org_id,
        _video_job_id: video_job_id,
        _platform: platform,
      });

      if (chargeError) {
        console.error(`Failed to charge credits for ${platform}:`, chargeError);
        throw new Error(`Insufficient credits for platform variant: ${platform}`);
      }

      // 5. Insert platform_variants row
      const { data: variant, error: variantError } = await supabase
        .from('platform_variants')
        .insert({
          video_job_id,
          platform,
          variant_status: 'queued',
          hashtags: meta.hashtags,
          caption: meta.caption,
          thumbnail_url: meta.thumbnail_url,
          engagement_prediction: meta.engagement_prediction,
        })
        .select()
        .single();

      if (variantError || !variant) {
        console.error(`Failed to create variant for ${platform}:`, variantError);
        continue;
      }

      // 6. Determine publish status (pending_review for regulated industries, else pending)
      const requiresManualReview = videoJob.organizations?.requires_manual_review_before_post ?? true;
      const publishStatus = requiresManualReview ? 'pending_review' : 'pending';
      
      // 7. Add publish_queue job
      const { error: queueError } = await supabase
        .from('publish_queue')
        .insert({
          org_id: videoJob.org_id,
          video_job_id,
          platform_specific_variant_id: variant.id,
          platform,
          final_url: videoJob.final_url, // Use base video URL for now
          caption: meta.caption,
          scheduled_time: getScheduledTime(videoJob.organizations?.default_post_time),
          status: publishStatus,
          brand_label: videoJob.brand_label,
          target_vertical: videoJob.target_vertical,
        });

      if (queueError) {
        console.error(`Failed to queue variant for ${platform}:`, queueError);
      } else {
        results.push({
          platform,
          variant_id: variant.id,
          status: 'queued',
        });
      }
    }

    // 8. Mark base job as ready_for_post
    await supabase
      .from('video_jobs')
      .update({ status: 'ready_for_post' })
      .eq('id', video_job_id);

    console.log('Platform variants generated:', results.length);

    return new Response(
      JSON.stringify({
        success: true,
        variants_created: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating platform variants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
