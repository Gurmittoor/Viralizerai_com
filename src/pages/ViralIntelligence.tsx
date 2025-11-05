import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Sparkles, Play, Eye, Heart, MessageCircle, Plus, RefreshCw } from "lucide-react";
import { AddTrendingUrlModal } from "@/components/AddTrendingUrlModal";

interface Framework {
  id: string;
  platform: string;
  title: string;
  summary: string;
  freshness_score: number;
}

interface TrendingVideo {
  id: string;
  platform: string;
  title: string;
  source_video_url: string;
  category: string;
  hook_text: string;
  thumbnail_url?: string;
  views: number;
  likes: number;
  comments: number;
  engagement_score: number;
  transcript?: string;
  embed_html?: string | null;
  clone_ready?: boolean;
  clone_score?: number;
  spoken_content?: boolean;
  detected_language?: string;
  is_ad?: boolean;
  virality_score?: number;
  clone_match_percent?: number;
  viral_rank?: number;
}

interface RelatedVideo {
  id: string;
  title: string;
  thumbnail_url?: string;
  views: number;
  platform: string;
}

export default function ViralIntelligence() {
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("english");
  const [categories, setCategories] = useState<string[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [replicationLog, setReplicationLog] = useState<any[]>([]);
  const [replicationHistory, setReplicationHistory] = useState<any[]>([]);
  const [runningCycle, setRunningCycle] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState<string | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<{ [key: string]: RelatedVideo[] }>({});
  const [sortByPrediction, setSortByPrediction] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (userData) {
        setOrgId(userData.org_id);
      }

      // Load frameworks
      const { data: frameworksData } = await supabase
        .from('viral_frameworks')
        .select('*')
        .order('freshness_score', { ascending: false })
        .limit(6);

      setFrameworks(frameworksData || []);

      // Load trending videos from last 2 days only
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const { data: trendsData } = await supabase
        .from('trends')
        .select('*')
        .gte('captured_at', twoDaysAgo.toISOString())
        .order('clone_ready', { ascending: false })
        .order('clone_score', { ascending: false })
        .order('views', { ascending: false })
        .limit(50);

      // Fetch viral scores and rankings for these videos
      if (trendsData && trendsData.length > 0) {
        const videoIds = trendsData.map(v => v.id);
        const { data: scoresData } = await supabase
          .from('viral_ranking')
          .select('*')
          .in('trend_id', videoIds);

        // Merge scores with videos
        const videosWithScores = trendsData.map(video => {
          const score = scoresData?.find(s => s.trend_id === video.id);
          return {
            ...video,
            virality_score: score?.virality_score,
            clone_match_percent: score?.clone_match_percent,
            viral_rank: score?.viral_rank,
          };
        });

        setTrendingVideos(videosWithScores);
      } else {
        setTrendingVideos([]);
      }

      // Extract unique categories
      const uniqueCategories = [...new Set(trendsData?.map(t => t.category).filter(Boolean) || [])];
      setCategories(uniqueCategories as string[]);

      // Load today's replication log
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: logData } = await supabase
        .from('daily_replication_log')
        .select('*')
        .gte('date', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (logData) {
        setReplicationLog(logData);
      }

      // Load replication history
      if (userData) {
        const { data: historyData } = await supabase
          .from('replication_history')
          .select('*')
          .eq('org_id', userData.org_id)
          .order('processed_at', { ascending: false })
          .limit(50);
        
        if (historyData) {
          setReplicationHistory(historyData);
        }
      }

    } catch (error) {
      console.error('Error loading viral intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromFramework = async (frameworkId: string) => {
    if (!orgId) return;

    try {
      const { error } = await supabase
        .from('video_jobs')
        .insert({
          org_id: orgId,
          trend_id: frameworkId,
          status: 'queued',
          compliance_status: 'unchecked',
          post_targets: ['tiktok', 'youtube_shorts'],
        });

      if (error) throw error;

      toast({
        title: "Video job created",
        description: "Generating a video using this viral framework.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create video job.",
        variant: "destructive",
      });
    }
  };

  const handleRecreateFromTrend = async (trendId: string) => {
    if (!orgId) return;

    try {
      // Check if already cloned
      const video = trendingVideos.find(v => v.id === trendId);
      if (video) {
        const { data: isCloned } = await supabase.rpc('is_source_cloned', {
          p_source_url: video.source_video_url,
          p_org_id: orgId
        });

        if (isCloned) {
          toast({
            title: "Already Cloned",
            description: "This video has already been cloned by your organization.",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "AI Analysis Started",
        description: "Scoring virality and adapting script to your brand...",
      });

      // Step 1: AI Score and Adapt
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-score-and-adapt', {
        body: { trend_id: trendId }
      });

      if (aiError) throw aiError;

      toast({
        title: "AI Analysis Complete",
        description: `Virality Score: ${Math.round(aiData.scores.overall_score)}% | ${aiData.auto_approve ? 'Auto-approved!' : 'Needs review'}`,
      });

      // Step 2: Create video job with adapted script
      const { data: job, error: jobError } = await supabase
        .from('video_jobs')
        .insert({
          org_id: orgId,
          trend_id: trendId,
          status: 'queued',
          script_draft: aiData.adapted_scripts?.[aiData.recommended_tone]?.script || "AI script generation pending...",
          adapted_script: aiData.adapted_scripts?.[aiData.recommended_tone]?.script,
          virality_score: aiData.scores.overall_score,
          adaptation_notes: aiData.adapted_scripts?.[aiData.recommended_tone]?.tone_notes || "",
          script_approved: aiData.auto_approve,
          autopilot_enabled: aiData.auto_approve,
          super_tone: aiData.super_tone || aiData.recommended_tone,
          cinematic_structure: aiData.cinematic_structure,
          super_variant_generated: !!aiData.adapted_scripts,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Mark source as cloned
      if (job && video) {
        await supabase.rpc('mark_source_cloned', {
          p_source_url: video.source_video_url,
          p_source_video_id: video.id,
          p_source_platform: video.platform,
          p_org_id: orgId,
          p_video_job_id: job.id,
          p_source_title: video.title,
          p_source_author: null,
          p_source_views: video.views,
          p_source_engagement_score: video.engagement_score
        });
      }

      // Step 3: If auto-approved, trigger rendering
      if (aiData.auto_approve && job) {
        toast({
          title: "Auto-Rendering Started",
          description: "High virality score detected! Approving and rendering video now...",
        });

        // Approve the script first
        const { error: approveError } = await supabase.functions.invoke('approve-script', {
          body: { job_id: job.id }
        });

        if (approveError) {
          console.error('Auto-approve failed:', approveError);
          toast({
            title: "Auto-Approve Failed",
            description: "Failed to auto-approve. Script queued for manual review.",
            variant: "destructive",
          });
        } else {
          // Start production
          const { error: productionError } = await supabase.functions.invoke('start-production', {
            body: { job_id: job.id }
          });

          if (productionError) {
            console.error('Auto-production failed:', productionError);
            toast({
              title: "Production Failed",
              description: "Script approved but rendering failed. Check Video Production tab.",
              variant: "destructive",
            });
          }
        }
      }

      toast({
        title: "Success!",
        description: `${aiData.super_bowl_ready ? '🏆 Super Bowl-quality ad' : 'Video'} ${aiData.auto_approve ? 'is rendering' : 'queued for review'}. Tone: ${aiData.super_tone || aiData.recommended_tone}`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create video job.",
        variant: "destructive",
      });
    }
  };

  const handleFetchTrendingVideos = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-trending-urls');
      
      if (error) throw error;

      toast({
        title: "Fetching trending videos",
        description: `Found ${data?.processed || 0} new viral videos across platforms.`,
      });

      // Reload the data
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch trending videos.",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleRunDailyCycle = async () => {
    setRunningCycle(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-viral-cycle');
      
      if (error) throw error;

      toast({
        title: "Daily Cycle Started",
        description: `Processing ${data?.new_trends || 0} new videos (${data?.duplicates_skipped || 0} duplicates skipped)`,
      });

      // Reload data after completion
      setTimeout(() => {
        loadData();
        setRunningCycle(false);
      }, 5000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to run daily viral cycle.",
        variant: "destructive",
      });
      setRunningCycle(false);
    }
  };

  const handleAnalyzeVideo = async (videoId: string) => {
    setAnalyzingVideo(videoId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-video-for-recreation', {
        body: { video_id: videoId }
      });
      
      if (error) throw error;

      // Store related videos for this video
      if (data?.related_videos) {
        setRelatedVideos(prev => ({
          ...prev,
          [videoId]: data.related_videos
        }));
      }

      toast({
        title: "Analysis Complete",
        description: `Found ${data?.related_count || 0} related viral videos`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze video",
        variant: "destructive",
      });
    } finally {
      setAnalyzingVideo(null);
    }
  };

  const getEmbedUrl = (url: string, platform: string) => {
    // YouTube
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^&?\/]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
    }
    
    // TikTok
    if (platform === 'tiktok' || url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
    }
    
    // Instagram
    if (platform === 'instagram' || url.includes('instagram.com')) {
      return `https://www.instagram.com/p/${url.split('/p/')[1]?.split('/')[0]}/embed`;
    }
    
    return null;
  };

  const filteredVideos = trendingVideos
    .filter(v => selectedCategory === "all" || v.category === selectedCategory)
    .filter(v => selectedLanguage === "all" || v.detected_language === selectedLanguage)
    .sort((a, b) => {
      if (sortByPrediction) {
        const scoreA = ((a.virality_score || 0) * 0.6 + (a.clone_match_percent || 0) * 0.4);
        const scoreB = ((b.virality_score || 0) * 0.6 + (b.clone_match_percent || 0) * 0.4);
        return scoreB - scoreA;
      }
      return 0;
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return <DashboardLayout><div className="text-center py-12">Loading intelligence...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Viral Intelligence</h1>
          <p className="text-muted-foreground mt-1">Trending content & AI-analyzed frameworks</p>
        </div>

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="trending">Trending Videos</TabsTrigger>
            <TabsTrigger value="queue">Replication Queue</TabsTrigger>
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4 mt-6">
            <div className="flex items-center justify-between gap-4">
              <Card className="bg-gradient-hero text-white shadow-elevated flex-1">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6" />
                    <div>
                      <h3 className="font-semibold">Top Viral Videos</h3>
                      <p className="text-white/90 text-sm">Watch & recreate with your brand</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button onClick={() => setAddModalOpen(true)} variant="outline" className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Viral Video
              </Button>

              <Button
                variant={sortByPrediction ? "default" : "outline"}
                onClick={() => setSortByPrediction(!sortByPrediction)}
                className="shrink-0"
              >
                {sortByPrediction ? "🔮 Sorted by Success" : "Sort by Success 🔮"}
              </Button>

              <Button 
                onClick={handleFetchTrendingVideos} 
                disabled={fetching}
                className="shrink-0"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
                {fetching ? 'Fetching...' : 'Fetch Trending Videos'}
              </Button>

              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="english">🇬🇧 English Only</SelectItem>
                  <SelectItem value="mixed">Mixed Language</SelectItem>
                  <SelectItem value="non-english">Non-English</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredVideos.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No trending videos available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredVideos.map((video) => {
                  const embedUrl = video.source_video_url.includes('youtube.com/embed') 
                    ? video.source_video_url 
                    : getEmbedUrl(video.source_video_url, video.platform);
                  
                  return (
                    <Card key={video.id} className="shadow-card hover:shadow-elevated transition-shadow overflow-hidden">
                      <div className="aspect-[9/16] max-h-[500px] bg-muted relative">
                        {video.embed_html ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: video.embed_html }}
                            className="w-full h-full flex items-center justify-center"
                          />
                        ) : embedUrl ? (
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            style={{ border: 'none', backgroundColor: '#000' }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-muted">
                            <a 
                              href={video.source_video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Play className="w-12 h-12" />
                              <span className="text-sm">View on {video.platform}</span>
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="secondary">{video.platform.toUpperCase()}</Badge>
                              {video.is_ad && (
                                <Badge variant="default" className="bg-purple-600 text-white">
                                  🎬 VIRAL AD
                                </Badge>
                              )}
                              {video.viral_rank && video.viral_rank <= 10 && (
                                <Badge variant="default" className="bg-yellow-500 text-black">
                                  🏆 #{video.viral_rank}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-accent border-accent">
                                {Math.round(video.engagement_score)}% engagement
                              </Badge>
                              {video.clone_ready && (
                                <Badge variant="default" className="bg-green-600 text-white">
                                  🔥 Clone Score: {video.clone_score}% | Easy to Recreate
                                </Badge>
                              )}
                              {video.category && video.category !== 'VIRAL_AD' && (
                                <Badge variant="outline">{video.category.replace('_', ' ')}</Badge>
                              )}
                              {video.virality_score && video.virality_score >= 60 && (
                                <Badge variant="destructive" className="bg-orange-500">
                                  🔥 Shock: {Math.round(video.virality_score)}
                                </Badge>
                              )}
                              {video.clone_match_percent && video.clone_match_percent >= 60 && (
                                <Badge variant="default" className="bg-pink-500">
                                  💖 Warmth: {Math.round(video.clone_match_percent)}
                                </Badge>
                              )}
                              {((video.virality_score || 0) * 0.6 + (video.clone_match_percent || 0) * 0.4) > 80 && (
                                <Badge variant="default" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                                  🌀 Share Magnet
                                </Badge>
                              )}
                              {((video.virality_score || 0) + (video.clone_match_percent || 0)) / 2 > 75 && video.clone_score >= 85 && (
                                <Badge variant="default" className="bg-gradient-to-r from-yellow-500 via-red-500 to-purple-600 text-white font-bold">
                                  🏆 Super Bowl Ready
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base">{video.title}</CardTitle>
                            {video.spoken_content && (
                              <p className="text-xs text-muted-foreground mt-1">
                                🎙️ Spoken content detected | Language: {video.detected_language || 'unknown'}
                              </p>
                            )}
                          </div>
                        </div>
                        {video.hook_text && (
                          <CardDescription className="mt-2 italic">"{video.hook_text}"</CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{formatNumber(video.views)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{formatNumber(video.likes)}</span>
                          </div>
                          {video.comments > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>{formatNumber(video.comments)}</span>
                            </div>
                          )}
                        </div>

                        {video.virality_score !== undefined && (
                          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">🔥 Viral Score</span>
                              <span className="font-semibold">{Math.round(video.virality_score)}/100</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">🎯 Clone Fit</span>
                              <span className="font-semibold">{Math.round(video.clone_match_percent || 0)}%</span>
                            </div>
                            {video.viral_rank && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">🏆 Viral Rank</span>
                                <span className="font-semibold">#{video.viral_rank}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          {relatedVideos[video.id] && relatedVideos[video.id].length > 0 && (
                            <div className="p-2 bg-muted rounded-md">
                              <p className="text-xs font-medium mb-2">🧠 Related Frameworks ({relatedVideos[video.id].length} similar videos):</p>
                              <div className="space-y-1">
                                {relatedVideos[video.id].slice(0, 3).map((rv) => (
                                  <p key={rv.id} className="text-xs text-muted-foreground truncate">
                                    • {rv.title} ({formatNumber(rv.views)} views)
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleAnalyzeVideo(video.id)}
                              variant="outline"
                              size="sm"
                              disabled={analyzingVideo === video.id}
                            >
                              {analyzingVideo === video.id ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-4 h-4 mr-2" />
                                  {relatedVideos[video.id] ? 'Refresh' : 'Find Related'}
                                </>
                              )}
                            </Button>
                            
                            <Button 
                              onClick={() => handleRecreateFromTrend(video.id)}
                              className="flex-1 bg-accent hover:bg-accent-hover"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Recreate for Your Brand
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Daily Replication Queue</h2>
                <p className="text-muted-foreground">
                  Auto-selected viral videos scheduled for recreation today
                </p>
              </div>
              <Button 
                onClick={handleRunDailyCycle} 
                disabled={runningCycle}
                size="lg"
              >
                {runningCycle ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running Cycle...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Daily Cycle Now
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-6">
              <Card className="bg-muted/50 border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Duplicate Prevention Active</h3>
                      <p className="text-sm text-muted-foreground">
                        {replicationHistory.filter(h => h.status === 'duplicate_skipped').length} duplicates prevented
                      </p>
                    </div>
                    <Badge variant="outline" className="text-accent border-accent">
                      {replicationHistory.length} total tracked
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {replicationLog.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No videos processed today. Click "Run Daily Cycle Now" to start automated replication.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {replicationLog.map((log) => (
                    <Card key={log.id} className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                log.status === 'scheduled' ? 'default' :
                                log.status === 'recreated' ? 'secondary' : 
                                'outline'
                              }>
                                {log.status}
                              </Badge>
                              <Badge variant="outline">{log.platform}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {log.source_video_url}
                            </p>
                            {log.scheduled_time && (
                              <p className="text-xs text-muted-foreground">
                                Scheduled for: {new Date(log.scheduled_time).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
          </Card>
        ))
        }
      </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="frameworks" className="space-y-4 mt-6">
            <Card className="bg-gradient-hero text-white shadow-elevated">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold">Viral Blueprints</h3>
                    <p className="text-white/90 text-sm">Abstracted patterns from top content</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {frameworks.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No viral frameworks available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {frameworks.map((framework) => (
                  <Card key={framework.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{framework.platform.replace('_', ' ')}</Badge>
                            <Badge variant="outline" className="text-accent border-accent">
                              Score: {Math.round(framework.freshness_score)}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{framework.title}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="mt-2">{framework.summary}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => handleGenerateFromFramework(framework.id)}
                        className="w-full bg-accent hover:bg-accent-hover"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Video Using This
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddTrendingUrlModal 
        open={addModalOpen} 
        onOpenChange={setAddModalOpen}
        onSuccess={loadData}
      />
    </DashboardLayout>
  );
}
