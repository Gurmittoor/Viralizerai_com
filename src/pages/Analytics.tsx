import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlatformStats {
  platform: string;
  videos_generated: number;
  avg_engagement_prediction: number;
}

export default function Analytics() {
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (userData?.org_id) {
        // Get all video jobs for this org first
        const { data: videoJobs } = await supabase
          .from('video_jobs')
          .select('id')
          .eq('org_id', userData.org_id);

        const jobIds = videoJobs?.map(j => j.id) || [];

        if (jobIds.length > 0) {
          // Get platform variant stats
          const { data: variantsData } = await supabase
            .from('platform_variants')
            .select('platform, engagement_prediction')
            .in('video_job_id', jobIds);

          if (variantsData) {
            // Group by platform
            const stats: Record<string, { count: number; total_prediction: number }> = {};
            
            variantsData.forEach(variant => {
              if (!stats[variant.platform]) {
                stats[variant.platform] = { count: 0, total_prediction: 0 };
              }
              stats[variant.platform].count++;
              stats[variant.platform].total_prediction += variant.engagement_prediction || 0;
            });

            const platformStats: PlatformStats[] = Object.entries(stats).map(([platform, data]) => ({
              platform,
              videos_generated: data.count,
              avg_engagement_prediction: data.count > 0 ? data.total_prediction / data.count : 0,
            }));

            setPlatformStats(platformStats.sort((a, b) => b.videos_generated - a.videos_generated));
          }
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalVideos = platformStats.reduce((sum, p) => sum + p.videos_generated, 0);
  const avgEngagement = platformStats.length > 0
    ? platformStats.reduce((sum, p) => sum + p.avg_engagement_prediction, 0) / platformStats.length
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track performance across platforms</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl">{totalVideos}</CardTitle>
              <CardDescription>Platform Variants Generated</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl">{platformStats.length}</CardTitle>
              <CardDescription>Active Platforms</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl">{Math.round(avgEngagement)}</CardTitle>
              <CardDescription>Avg Engagement Score</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Per-Platform Performance */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <CardTitle>Per-Platform Performance</CardTitle>
            </div>
            <CardDescription>
              Video generation and engagement predictions by platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
            ) : platformStats.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No analytics data yet</p>
                <p className="text-sm text-muted-foreground">
                  Generate platform-optimized videos to start tracking performance
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Videos Generated</TableHead>
                    <TableHead className="text-right">Avg Engagement Prediction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformStats.map((stat) => {
                    const displayName = stat.platform === 'youtube_shorts' ? 'YouTube Shorts' :
                                      stat.platform === 'instagram_reels' ? 'Instagram Reels' :
                                      stat.platform === 'facebook_reels' ? 'Facebook Reels' :
                                      'TikTok';
                    return (
                      <TableRow key={stat.platform}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell className="text-right">{stat.videos_generated}</TableCell>
                        <TableCell className="text-right">
                          {Math.round(stat.avg_engagement_prediction)}
                          <span className="text-xs text-muted-foreground ml-1">/100</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card bg-muted/30">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Engagement predictions are AI-generated estimates. Real performance data will be available once AutoPoster247 feeds back actual view counts, likes, and shares from published content.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
