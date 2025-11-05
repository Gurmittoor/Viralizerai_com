import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting daily viral cycle with multi-track content system...');

    // Step 1: Fetch trending videos
    const { data: trendsData, error: trendsError } = await supabaseAdmin.functions.invoke('fetch-trending-urls');
    
    if (trendsError) {
      console.error('Error fetching trends:', trendsError);
      throw trendsError;
    }

    console.log('Fetched trending videos');

    // Step 2: Get all trends from last 7 days with >1M views
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: allTrends, error: fetchError } = await supabaseAdmin
      .from('trends')
      .select(`
        *,
        viral_scores (
          clone_score,
          virality_score,
          commercial_dna_score,
          shareability_score,
          overall_score,
          category,
          ad_type,
          emotional_depth,
          informational_value,
          transformation_score
        )
      `)
      .gte('captured_at', sevenDaysAgo.toISOString())
      .gte('views', 1000000)
      .order('views', { ascending: false })
      .limit(100);

    if (fetchError || !allTrends || allTrends.length === 0) {
      console.log('No trending videos found');
      return new Response(
        JSON.stringify({ message: 'No trending videos found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allTrends.length} trending videos`);

    // Step 3: Multi-Track Studio Selection System
    
    // Track 1: SHORT-FORM VIRAL ADS (4/day) - Viral, UGC, Super Bowl style
    const shortFormCandidates = allTrends
      .filter(trend => {
        const duration = trend.duration_seconds || 0;
        const scores = trend.viral_scores?.[0];
        const category = scores?.category || 'short_form';
        const adType = scores?.ad_type || 'commercial';
        
        return category === 'short_form' &&
               duration <= 60 && 
               duration > 0 &&
               ['ugc', 'superbowl', 'commercial'].includes(adType) &&
               scores?.commercial_dna_score >= 60 &&
               scores?.clone_score >= 60;
      })
      .map(trend => {
        const scores = trend.viral_scores?.[0] || {};
        const capturedAt = new Date(trend.captured_at);
        const hoursOld = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60);
        const recencyFactor = Math.max(0, 1 - (hoursOld / 168));
        
        // Studio formula: virality × shareability × shock_warmth × recency
        const viralityScore = (
          (scores.virality_score || 0) * 0.4 +
          (scores.shareability_score || 0) * 0.3 +
          (scores.shock_warmth_ratio || scores.shock_score || 0) * 0.3 +
          (recencyFactor * 100) * 0.1
        );
        
        return { ...trend, score: viralityScore, adType: scores.ad_type };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // Track 2: LONG-FORM VALUE VIDEOS (2/day) - Educational, Motivational, Informational
    const longFormCandidates = allTrends
      .filter(trend => {
        const duration = trend.duration_seconds || 0;
        const scores = trend.viral_scores?.[0];
        const category = scores?.category || (duration > 300 ? 'long_form' : 'short_form');
        const adType = scores?.ad_type || 'educational';
        
        return category === 'long_form' &&
               duration >= 300 && // At least 5 minutes
               duration <= 900 && // Max 15 minutes
               ['educational', 'motivational', 'informational'].includes(adType) &&
               (scores?.informational_value >= 60 || scores?.transformation_score >= 60);
      })
      .map(trend => {
        const scores = trend.viral_scores?.[0] || {};
        const capturedAt = new Date(trend.captured_at);
        const hoursOld = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60);
        const recencyFactor = Math.max(0, 1 - (hoursOld / 168));
        
        // Value formula: informational × transformation × emotional × recency
        const valueScore = (
          (scores.informational_value || 0) * 0.5 +
          (scores.transformation_score || 0) * 0.3 +
          (scores.emotional_depth || 0) * 0.2 +
          (recencyFactor * 100) * 0.1
        );
        
        return { ...trend, score: valueScore, adType: scores.ad_type };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    const selectedTrends = [...shortFormCandidates, ...longFormCandidates];

    console.log(`Selected ${shortFormCandidates.length} short-form + ${longFormCandidates.length} long-form videos`);

    if (selectedTrends.length === 0) {
      console.log('No qualified trends found');
      return new Response(
        JSON.stringify({ message: 'No qualified trends found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Check for duplicates in replication_history
    const trendUrls = selectedTrends.map(t => t.source_video_url);
    const { data: existingHistory } = await supabaseAdmin
      .from('replication_history')
      .select('source_video_url')
      .in('source_video_url', trendUrls);

    const alreadyProcessedUrls = new Set(existingHistory?.map(h => h.source_video_url) || []);
    
    // Filter out already processed trends
    const newTrends = selectedTrends.filter(t => !alreadyProcessedUrls.has(t.source_video_url));
    
    if (newTrends.length === 0) {
      console.log('All selected trends have already been processed');
      return new Response(
        JSON.stringify({ 
          message: 'All trending videos already processed',
          duplicates_skipped: selectedTrends.length,
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${newTrends.length} new trends (${alreadyProcessedUrls.size} duplicates skipped)`);

    // Step 5: Get all organizations with autopilot enabled
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('autopilot_enabled', true);

    if (orgsError || !orgs || orgs.length === 0) {
      console.log('No organizations with autopilot enabled');
      return new Response(
        JSON.stringify({ message: 'No organizations with autopilot enabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing for ${orgs.length} organizations`);

    let totalProcessed = 0;
    let shortFormProcessed = 0;
    let longFormProcessed = 0;
    let duplicatesSkipped = 0;

    // Step 6: For each org, recreate videos
    for (const org of orgs) {
      console.log(`Processing org: ${org.name} (${org.id})`);

      // Get org's first brand or use null
      const { data: brands } = await supabaseAdmin
        .from('brands')
        .select('id')
        .eq('org_id', org.id)
        .limit(1);

      const brandId = brands && brands.length > 0 ? brands[0].id : null;

      // Process each new trend
      for (const trend of newTrends) {
        try {
          const scores = trend.viral_scores?.[0] || {};
          const isLongForm = scores.category === 'long_form' || trend.duration_seconds > 60;
          const contentType = isLongForm ? 'long-form value video' : 'short-form viral ad';
          
          console.log(`Creating ${contentType} job for: ${trend.title}`);

          // Create video job directly (recreate-from-url logic inline)
          const platformCount = 4; // tiktok, youtube_shorts, instagram, facebook
          const creditsCost = 120 + (10 * platformCount);

          // Check credits
          const { data: wallet, error: walletError } = await supabaseAdmin
            .from('credits_wallet')
            .select('current_credits')
            .eq('org_id', org.id)
            .single();

          if (walletError || !wallet || wallet.current_credits < creditsCost) {
            console.log(`Insufficient credits for org ${org.id}`);
            continue;
          }

          // Charge credits
          const { error: chargeError } = await supabaseAdmin.rpc('charge_credits', {
            _org_id: org.id,
            _feature: 'daily_viral_cycle',
            _cost: creditsCost,
            _description: `Daily viral cycle [${contentType}]: ${trend.platform} - ${trend.title}`
          });

          if (chargeError) {
            console.error('Error charging credits:', chargeError);
            continue;
          }

          // Create video job
          const { data: videoJob, error: jobError } = await supabaseAdmin
            .from('video_jobs')
            .insert({
              org_id: org.id,
              brand_id: brandId,
              trend_id: trend.id,
              status: 'queued',
              compliance_status: 'unchecked',
              post_targets: ['tiktok', 'youtube_shorts', 'instagram', 'facebook'],
              target_vertical: trend.category || 'general',
              campaign_type: 'brand_awareness',
              autopilot_enabled: true,
              autopilot_snapshot: true
            })
            .select()
            .single();

          if (jobError) {
            console.error('Error creating video job:', jobError);
            continue;
          }

          // Calculate scheduled times based on content type
          const baseTime = new Date();
          baseTime.setDate(baseTime.getDate() + 1); // Schedule for tomorrow
          
          const platforms = ['tiktok', 'youtube_shorts', 'instagram', 'facebook'];
          let scheduledTimes: Date[] = [];

          if (isLongForm) {
            // Long-form: 8 AM and 8 PM (YouTube primary)
            const morning = new Date(baseTime);
            morning.setHours(8, 0, 0, 0);
            const evening = new Date(baseTime);
            evening.setHours(20, 0, 0, 0);
            scheduledTimes = [morning, morning, evening, evening]; // Duplicate for all platforms
          } else {
            // Short-form: 9 AM, 12 PM, 3 PM, 6 PM
            const times = [9, 12, 15, 18];
            scheduledTimes = times.map(hour => {
              const t = new Date(baseTime);
              t.setHours(hour, 0, 0, 0);
              return t;
            });
          }
          
          for (let i = 0; i < platforms.length; i++) {
            // Log replication
            await supabaseAdmin
              .from('daily_replication_log')
              .insert({
                org_id: org.id,
                source_video_url: trend.source_video_url,
                platform: platforms[i],
                status: 'scheduled',
                scheduled_time: scheduledTimes[i].toISOString(),
                video_job_id: videoJob.id
              });
          }

          // Add to replication history to prevent future duplicates
          await supabaseAdmin
            .from('replication_history')
            .insert({
              source_video_url: trend.source_video_url,
              platform: trend.platform,
              remake_job_id: videoJob.id,
              processed_at: new Date().toISOString(),
              scheduled_time: scheduledTimes[0].toISOString(),
              status: 'scheduled',
              org_id: org.id
            });

          totalProcessed++;
          if (isLongForm) {
            longFormProcessed++;
          } else {
            shortFormProcessed++;
          }
          console.log(`Created ${contentType} job ${videoJob.id} with scheduled posts`);

        } catch (error) {
          console.error('Error processing trend:', error);
          continue;
        }
      }

      // Log skipped duplicates for this org
      for (const url of alreadyProcessedUrls) {
        await supabaseAdmin
          .from('replication_history')
          .upsert({
            source_video_url: url,
            status: 'duplicate_skipped',
            org_id: org.id,
            processed_at: new Date().toISOString()
          }, { 
            onConflict: 'source_video_url',
            ignoreDuplicates: false 
          });
        duplicatesSkipped++;
      }
    }

    console.log(`Daily viral cycle complete. Processed ${totalProcessed} videos (${shortFormProcessed} short + ${longFormProcessed} long), skipped ${duplicatesSkipped} duplicates.`);

    // Send daily email report
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
      } else {
        const today = new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

        // Build email body
        let emailBody = `🎬 Daily Viral Studio Report - ${today}\n\n`;
        emailBody += `📊 Production Summary:\n`;
        emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        emailBody += `  Evaluated: ${allTrends.length} viral videos\n`;
        emailBody += `  Short-form pool: ${shortFormCandidates.length} (UGC/Super Bowl/Viral)\n`;
        emailBody += `  Long-form pool: ${longFormCandidates.length} (Educational/Motivational)\n`;
        emailBody += `  Videos created: ${totalProcessed} total\n`;
        emailBody += `    → ${shortFormProcessed} short-form ads\n`;
        emailBody += `    → ${longFormProcessed} long-form value videos\n`;
        emailBody += `  Skipped (duplicates): ${alreadyProcessedUrls.size}\n`;
        emailBody += `  Organizations: ${orgs.length}\n`;
        emailBody += `  Rendering: Veo 3.1 Fast (Google AI Ultra Credits)\n\n`;

        if (shortFormProcessed > 0) {
          emailBody += `🎯 Short-Form Ads Created (${shortFormProcessed}):\n`;
          emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          const shortDetails = selectedTrends.filter(t => {
            const scores = t.viral_scores?.[0];
            return scores?.category === 'short_form';
          });
          for (const video of shortDetails) {
            const scores = video.viral_scores?.[0];
            emailBody += `  📱 ${video.title}\n`;
            emailBody += `     Type: ${scores?.ad_type || 'commercial'} | Score: ${video.score?.toFixed(1)}\n`;
            emailBody += `     Scheduled: 9AM, 12PM, 3PM, 6PM\n`;
            emailBody += `     Platforms: TikTok, Instagram, YouTube Shorts, Facebook\n\n`;
          }
        }

        if (longFormProcessed > 0) {
          emailBody += `📚 Long-Form Videos Created (${longFormProcessed}):\n`;
          emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          const longDetails = selectedTrends.filter(t => {
            const scores = t.viral_scores?.[0];
            return scores?.category === 'long_form';
          });
          for (const video of longDetails) {
            const scores = video.viral_scores?.[0];
            emailBody += `  🎓 ${video.title}\n`;
            emailBody += `     Type: ${scores?.ad_type || 'educational'} | Score: ${video.score?.toFixed(1)}\n`;
            emailBody += `     Duration: ${Math.floor((video.duration_seconds || 0) / 60)}m ${(video.duration_seconds || 0) % 60}s\n`;
            emailBody += `     Scheduled: 8AM, 8PM\n`;
            emailBody += `     Primary: YouTube | Clips: TikTok, Instagram, Shorts\n\n`;
          }
        }

        if (alreadyProcessedUrls.size > 0) {
          emailBody += `⏭️ Skipped (Already Processed): ${alreadyProcessedUrls.size}\n`;
          emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          const urlArray = Array.from(alreadyProcessedUrls).slice(0, 5);
          for (const url of urlArray) {
            emailBody += `  • ${url.substring(0, 60)}...\n`;
          }
          if (alreadyProcessedUrls.size > 5) {
            emailBody += `  ... and ${alreadyProcessedUrls.size - 5} more\n`;
          }
          emailBody += `\n`;
        }

        emailBody += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        emailBody += `💰 Credits: App credits charged for scripting only.\n`;
        emailBody += `    Video rendering uses Google AI Ultra for Business.\n`;
        emailBody += `🤖 Powered by ViralVideoFactory247 + Veo 3.1 Fast\n`;

        // Send email via Resend API
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ViralVideoFactory247 <onboarding@resend.dev>',
            to: ['gurmit@dealsonfasttrack.com'],
            subject: `🎬 Daily Viral Studio Report — ${today}`,
            text: emailBody,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Error sending email:', errorText);
        } else {
          console.log('Daily email report sent successfully');
        }
      }
    } catch (emailError) {
      console.error('Error sending email report:', emailError);
      // Don't fail the function if email fails
    }

    return new Response(
      JSON.stringify({ 
        message: 'Daily viral cycle completed',
        trends_evaluated: allTrends.length,
        short_form_selected: shortFormCandidates.length,
        long_form_selected: longFormCandidates.length,
        total_selected: selectedTrends.length,
        new_trends: newTrends.length,
        duplicates_skipped: alreadyProcessedUrls.size,
        organizations_processed: orgs.length,
        videos_created: totalProcessed,
        short_form_created: shortFormProcessed,
        long_form_created: longFormProcessed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-viral-cycle:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
