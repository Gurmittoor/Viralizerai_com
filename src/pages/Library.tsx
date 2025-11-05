import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Play, Copy, Folder, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoJob {
  id: string;
  final_url: string | null;
  target_vertical: string;
  brand_label: string;
  created_at: string;
  status: string;
  compliance_status: string;
}

interface PlatformVariant {
  id: string;
  video_job_id: string;
  platform: string;
  variant_url: string | null;
  variant_status: string;
  created_at: string;
}

export default function Library() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [variants, setVariants] = useState<PlatformVariant[]>([]);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [verticalCounts, setVerticalCounts] = useState<Record<string, number>>({});
  const [platformCounts, setPlatformCounts] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (userData?.org_id) {
        const { data: videosData } = await supabase
          .from('video_jobs')
          .select('*')
          .eq('org_id', userData.org_id)
          .in('status', ['ready_for_post', 'rendered'])
          .not('final_url', 'is', null)
          .order('created_at', { ascending: false });

        const vids = videosData || [];
        setVideos(vids);

        // Count videos per vertical
        const counts: Record<string, number> = {};
        vids.forEach(v => {
          const vertical = v.target_vertical || 'general';
          counts[vertical] = (counts[vertical] || 0) + 1;
        });
        setVerticalCounts(counts);

        // Load platform variants
        const { data: variantsData } = await supabase
          .from('platform_variants')
          .select('*')
          .in('video_job_id', vids.map(v => v.id))
          .eq('variant_status', 'rendered')
          .order('created_at', { ascending: false });

        const allVariants = variantsData || [];
        setVariants(allVariants);

        // Count variants per vertical per platform
        const platCounts: Record<string, Record<string, number>> = {};
        allVariants.forEach(variant => {
          const video = vids.find(v => v.id === variant.video_job_id);
          if (!video) return;
          
          const vertical = video.target_vertical || 'general';
          if (!platCounts[vertical]) platCounts[vertical] = {};
          platCounts[vertical][variant.platform] = (platCounts[vertical][variant.platform] || 0) + 1;
        });
        setPlatformCounts(platCounts);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied", description: "Video URL copied to clipboard" });
  };

  if (loading) {
    return <DashboardLayout><div className="text-center py-12">Loading library...</div></DashboardLayout>;
  }

  const uniqueVerticals = Object.keys(verticalCounts).sort();
  
  const filteredVideos = selectedVertical && !selectedPlatform
    ? videos.filter(v => (v.target_vertical || 'general') === selectedVertical)
    : selectedVertical && selectedPlatform
    ? videos.filter(v => (v.target_vertical || 'general') === selectedVertical)
    : videos;
  
  const filteredVariants = selectedPlatform && selectedVertical
    ? variants.filter(v => {
        const video = videos.find(vid => vid.id === v.video_job_id);
        return video && (video.target_vertical || 'general') === selectedVertical && v.platform === selectedPlatform;
      })
    : [];

  const displayItems = selectedPlatform && selectedVertical ? filteredVariants : filteredVideos;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Video Library</h1>
          <p className="text-muted-foreground mt-1">Browse and manage your finished videos</p>
        </div>

        {videos.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No finished videos yet</p>
              <p className="text-sm text-muted-foreground">Videos that complete the pipeline will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-4 gap-6">
            {/* Vertical folders - left sidebar */}
            <div className="md:col-span-1 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">Industries</h3>
              <Button
                variant={selectedVertical === null ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedVertical(null);
                  setSelectedPlatform(null);
                }}
              >
                <Folder className="w-4 h-4 mr-2" />
                All Videos ({videos.length})
              </Button>
              
              {uniqueVerticals.map(vertical => (
                <div key={vertical} className="space-y-1">
                  <Button
                    variant={selectedVertical === vertical && !selectedPlatform ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedVertical(vertical);
                      setSelectedPlatform(null);
                    }}
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    <span className="flex-1 text-left truncate">
                      {vertical.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                    <Badge variant="secondary" className="ml-2">{verticalCounts[vertical]}</Badge>
                  </Button>
                  
                  {/* Platform sub-items when vertical is selected */}
                  {selectedVertical === vertical && platformCounts[vertical] && (
                    <div className="ml-6 space-y-1">
                      {Object.entries(platformCounts[vertical]).map(([platform, count]) => {
                        const displayName = platform === 'youtube_shorts' ? 'YouTube Shorts' :
                                          platform === 'instagram_reels' ? 'Instagram Reels' :
                                          platform === 'facebook_reels' ? 'Facebook Reels' :
                                          'TikTok';
                        return (
                          <Button
                            key={platform}
                            variant={selectedPlatform === platform ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => setSelectedPlatform(platform)}
                          >
                            <span className="flex-1 text-left">{displayName}</span>
                            <Badge variant="outline" className="ml-2">{count}</Badge>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Video/Variant grid - main content */}
            <div className="md:col-span-3">
              {displayItems.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No {selectedPlatform ? 'platform variants' : 'videos'} in {selectedVertical ? selectedVertical.replace(/-/g, ' ') : 'this category'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedPlatform ? (
                    // Display platform variants
                    filteredVariants.map(variant => {
                      const video = videos.find(v => v.id === variant.video_job_id);
                      return (
                        <Card key={variant.id} className="shadow-card hover:shadow-elevated transition-shadow overflow-hidden">
                          <div className="aspect-video bg-muted flex items-center justify-center relative">
                            {variant.variant_url ? (
                              <video 
                                src={variant.variant_url} 
                                className="w-full h-full object-cover"
                                controls
                              />
                            ) : (
                              <Play className="w-12 h-12 text-muted-foreground" />
                            )}
                            <div className="absolute top-2 left-2 flex gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {variant.platform === 'youtube_shorts' ? 'Shorts' :
                                 variant.platform === 'instagram_reels' ? 'IG Reels' :
                                 variant.platform === 'facebook_reels' ? 'FB Reels' :
                                 'TikTok'}
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="pt-4 space-y-2">
                            {video?.brand_label && (
                              <p className="text-sm font-medium">{video.brand_label}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(variant.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex gap-2">
                              {variant.variant_url && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={() => handleCopyUrl(variant.variant_url!)}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy URL
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(variant.variant_url!, '_blank')}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    // Display base videos
                    filteredVideos.map(video => (
                      <Card key={video.id} className="shadow-card hover:shadow-elevated transition-shadow overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center relative">
                        {video.final_url ? (
                          <video 
                            src={video.final_url} 
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <Play className="w-12 h-12 text-muted-foreground" />
                        )}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {video.target_vertical && video.target_vertical !== 'general' && (
                            <Badge variant="secondary" className="text-xs">
                              {video.target_vertical.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="pt-4 space-y-2">
                        {video.brand_label && (
                          <p className="text-sm font-medium">{video.brand_label}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(video.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          {video.final_url && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleCopyUrl(video.final_url!)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy URL
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.final_url!, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
