import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Zap, Loader2, Check, RotateCcw, Clock } from "lucide-react";
import { MultiVerticalGenerator } from "@/components/MultiVerticalGenerator";
import { formatDistanceToNow } from "date-fns";

interface ProductionJob {
  id: string;
  status: string;
  target_vertical: string;
  brand_label: string | null;
  created_at: string;
  script_approved: boolean;
  final_url: string | null;
}

export default function VideoProduction() {
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);

  useEffect(() => {
    loadOrgData();
    loadProductionJobs();
  }, []);

  const loadProductionJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!userData?.org_id) return;

      const { data: jobs } = await supabase
        .from('video_jobs')
        .select('id, status, target_vertical, brand_label, created_at, script_approved, final_url')
        .eq('org_id', userData.org_id)
        .eq('script_approved', true)
        .in('status', ['approved', 'rendering', 'rendered', 'stopped', 'failed'])
        .order('created_at', { ascending: false });

      if (jobs) {
        setProductionJobs(jobs);
      }
    } catch (error) {
      console.error('Error loading production jobs:', error);
    }
  };

  const loadOrgData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (userData?.org_id) {
        setOrgId(userData.org_id);

        const { data: wallet } = await supabase
          .from('credits_wallet')
          .select('current_credits')
          .eq('org_id', userData.org_id)
          .single();

        if (wallet) {
          setCredits(Math.floor(wallet.current_credits));
        }
      }
    } catch (error) {
      console.error('Error loading org data:', error);
    }
  };

  const handleStartProduction = () => {
    if (!credits || credits < 2) {
      toast({
        title: "Insufficient credits",
        description: "You need at least 2 credits to generate a script.",
        variant: "destructive",
      });
      return;
    }

    setSelectedVerticals(['general']);
    setShowGenerator(true);
  };

  const handleStopRender = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('video_jobs')
        .update({ 
          status: 'stopped',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Rendering stopped",
        description: "The video rendering has been cancelled.",
      });

      loadProductionJobs();
    } catch (error) {
      console.error('Error stopping render:', error);
      toast({
        title: "Error",
        description: "Failed to stop render. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRetryRender = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('video_jobs')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Render restarted",
        description: "Click 'Start Production' to begin rendering.",
      });

      loadProductionJobs();
    } catch (error) {
      console.error('Error retrying render:', error);
      toast({
        title: "Error",
        description: "Failed to restart render. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartProductionForJob = async (jobId: string) => {
    try {
      toast({
        title: "Starting production",
        description: "Generating scene images and stitching video...",
      });

      const { error } = await supabase.functions.invoke('start-production', {
        body: { job_id: jobId }
      });

      if (error) throw error;

      toast({
        title: "Production started",
        description: "Video is now being rendered.",
      });

      loadProductionJobs();
    } catch (error) {
      console.error('Error starting production:', error);
      toast({
        title: "Error",
        description: "Failed to start production. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getElapsedTime = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  const isRenderingTooLong = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return elapsed > 10 * 60 * 1000; // 10 minutes
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Production</h1>
            <p className="text-muted-foreground mt-1">Generate AI-powered videos for your campaigns</p>
          </div>
          {credits !== null && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Credits:</span>
              <Badge variant="secondary" className="font-mono">
                {credits}
              </Badge>
            </div>
          )}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Start Video Production</CardTitle>
              <CardDescription>
                Generate professional videos using AI. Initial cost is 2 credits for script generation.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-6 rounded-lg bg-muted/50 border">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Generate New Videos</h3>
                <p className="text-sm text-muted-foreground">
                  Create AI-generated videos optimized for multiple platforms
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    2 credits for script
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Auto-optimized for TikTok, Shorts & Reels
                  </Badge>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={handleStartProduction}
                className="bg-accent hover:bg-accent-hover"
                  disabled={!credits || credits < 2}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Production
                </Button>
            </div>

            {(!credits || credits < 2) && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  Insufficient credits. You need at least 2 credits to generate a script. 
                  <a href="/billing" className="underline ml-1">Purchase credits</a>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Script Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    AI-powered script writing tailored to your brand voice
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Compliance Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Automated policy compliance and content verification
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Video Rendering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    High-quality video generation optimized for social platforms
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {productionJobs.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Videos in Production</CardTitle>
              <CardDescription>
                Approved scripts currently being rendered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productionJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm font-semibold">
                          Job #{job.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {job.brand_label || job.target_vertical}
                        </span>
                        {job.status === 'rendering' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{getElapsedTime(job.created_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        job.status === 'rendered' ? 'default' : 
                        job.status === 'stopped' || job.status === 'failed' ? 'destructive' : 
                        job.status === 'approved' ? 'outline' :
                        'secondary'
                      }>
                        {job.status === 'approved' ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Ready for Production
                          </>
                        ) : job.status === 'rendering' ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Rendering
                          </>
                        ) : job.status === 'rendered' ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Complete
                          </>
                        ) : job.status === 'failed' ? (
                          <>
                            Failed
                          </>
                        ) : job.status === 'stopped' ? (
                          <>
                            Stopped
                          </>
                        ) : job.status}
                      </Badge>
                      
                      {job.status === 'approved' && (
                        <Button 
                          size="sm" 
                          className="bg-accent hover:bg-accent-hover"
                          onClick={() => handleStartProductionForJob(job.id)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start Production
                        </Button>
                      )}
                      
                      {job.status === 'rendering' && isRenderingTooLong(job.created_at) && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleStopRender(job.id)}
                        >
                          Stop Rendering
                        </Button>
                      )}
                      
                      {(job.status === 'stopped' || job.status === 'failed') && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRetryRender(job.id)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      
                      {job.final_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={job.final_url} target="_blank" rel="noopener noreferrer">
                            View Video
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {orgId && (
        <MultiVerticalGenerator
          selectedVerticals={selectedVerticals}
          orgId={orgId}
          open={showGenerator}
          onClose={() => setShowGenerator(false)}
          onSuccess={() => {
            setShowGenerator(false);
            loadOrgData();
            loadProductionJobs();
            toast({
              title: "Videos in production",
              description: "Check the Pipeline to track progress.",
            });
          }}
        />
      )}
    </DashboardLayout>
  );
}
