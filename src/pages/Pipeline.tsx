import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, ComplianceBadge } from "@/components/StatusBadge";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { ScriptEditorModal } from "@/components/ScriptEditorModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Trash2, FileText, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VideoJob {
  id: string;
  status: string;
  compliance_status: string;
  compliance_report: any;
  scene_prompts: any;
  final_url: string | null;
  transcript: string | null;
  created_at: string;
  target_vertical: string;
  brand_label: string;
  storage_path: string | null;
  post_targets: string[];
  script_draft: string | null;
  cta_custom: string | null;
  script_approved: boolean | null;
  autopilot_enabled: boolean | null;
}

interface PlatformVariant {
  platform: string;
  variant_status: string;
}

export default function Pipeline() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [platformVariants, setPlatformVariants] = useState<Record<string, PlatformVariant[]>>({});
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [uniqueVerticals, setUniqueVerticals] = useState<string[]>([]);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<VideoJob | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const handleOpenScriptEditor = (job: VideoJob) => {
    setSelectedJob(job);
    setScriptModalOpen(true);
  };

  const handleScriptApproved = () => {
    loadJobs(); // Refresh the list
  };

  const handleGenerateScript = async (jobId: string) => {
    if (!orgId) return;
    
    try {
      toast({
        title: "Generating script",
        description: "AI is drafting your video script...",
      });

      const { data, error } = await supabase.functions.invoke('generate-script-draft', {
        body: { job_id: jobId }
      });

      if (error) throw error;

      toast({
        title: "Script generated",
        description: "Your script draft is ready for review.",
      });

      loadJobs();
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: "Error",
        description: "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadJobs = async () => {
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
        // Only show jobs that haven't been approved for production yet
        const { data: jobsData } = await supabase
          .from('video_jobs')
          .select('*')
          .eq('org_id', userData.org_id)
          .eq('script_approved', false)
          .order('created_at', { ascending: false });

        const jobs = jobsData || [];
        setJobs(jobs);
        
        // Extract unique verticals for filter
        const verticals = Array.from(new Set(jobs.map(j => j.target_vertical || 'general')));
        setUniqueVerticals(verticals.sort());

        // Load platform variants for each job
        const variantsMap: Record<string, PlatformVariant[]> = {};
        for (const job of jobs) {
          const { data: variants } = await supabase
            .from('platform_variants')
            .select('platform, variant_status')
            .eq('video_job_id', job.id);
          
          if (variants) {
            variantsMap[job.id] = variants;
          }
        }
        setPlatformVariants(variantsMap);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!orgId) return;
    
    try {
      // Charge credits for video generation (estimated 7 credits: 2 for script + 1 compliance + 4 for render)
      const { error: chargeError } = await supabase.rpc('charge_credits', {
        _org_id: orgId,
        _feature: 'video_generation',
        _cost: 7,
        _description: 'Generate new video (script + compliance + render)',
      });

      if (chargeError) {
        toast({
          title: "Insufficient credits",
          description: "You need 7 credits to generate a video. Please purchase more credits.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('video_jobs')
        .insert({
          org_id: orgId,
          status: 'queued',
          compliance_status: 'unchecked',
          post_targets: ['tiktok', 'youtube_shorts'],
        });

      if (error) throw error;

      toast({
        title: "Video job created",
        description: "Your video is now in the generation queue. 7 credits deducted.",
      });

      loadJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create video job.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('video_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Job deleted",
        description: "Video job removed from pipeline.",
      });

      loadJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <DashboardLayout><div className="text-center py-12">Loading pipeline...</div></DashboardLayout>;
  }

  const filteredJobs = verticalFilter === "all" 
    ? jobs 
    : jobs.filter(j => j.target_vertical === verticalFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Pipeline</h1>
            <p className="text-muted-foreground mt-1">Track your videos through the generation process</p>
          </div>
          <div className="flex items-center gap-4">
            {uniqueVerticals.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verticals</SelectItem>
                    {uniqueVerticals.map(v => (
                      <SelectItem key={v} value={v}>
                        {v.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col items-end gap-2">
              <Button 
                onClick={handleCreateJob} 
                size="lg"
                className="bg-accent hover:bg-accent-hover"
              >
                <Play className="w-4 h-4 mr-2" />
                Generate New Video
              </Button>
              <CreditCostBadge cost={7} feature="Full video generation (script + compliance + render)" />
            </div>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {verticalFilter === "all" ? "No videos in pipeline yet." : `No videos for ${verticalFilter}`}
              </p>
              {verticalFilter !== "all" ? (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setVerticalFilter("all")}
                >
                  Show all verticals
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateJob} 
                  variant="outline" 
                  className="mt-4"
                >
                  Create your first video
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="shadow-card hover:shadow-elevated transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">Video Job #{job.id.slice(0, 8)}</CardTitle>
                        {job.target_vertical && job.target_vertical !== 'general' && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">
                            {job.target_vertical.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </Badge>
                        )}
                        {job.brand_label && (
                          <Badge variant="secondary">
                            {job.brand_label}
                          </Badge>
                        )}
                        <StatusBadge status={job.status as any} />
                        <ComplianceBadge status={job.compliance_status as any} />
                        {job.script_approved && (
                          <Badge variant="default" className="bg-success">✅ Script Approved</Badge>
                        )}
                        {job.status === 'script_ready' && !job.script_approved && (
                          <Badge variant="default" className="bg-blue-500">📝 Script Ready</Badge>
                        )}
                        {!job.script_draft && job.status === 'queued' && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">🟡 Draft Pending</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Created {new Date(job.created_at).toLocaleDateString()}
                      </CardDescription>
                      
                      {/* Platform Variants Status */}
                      {platformVariants[job.id] && platformVariants[job.id].length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground mb-2">Platform Variants:</div>
                          <div className="flex flex-wrap gap-2">
                            {['tiktok', 'youtube_shorts', 'instagram_reels', 'facebook_reels'].map(platform => {
                              const variant = platformVariants[job.id]?.find(v => v.platform === platform);
                              if (!variant) return null;
                              
                              const displayName = platform === 'youtube_shorts' ? 'Shorts' :
                                                platform === 'instagram_reels' ? 'IG Reels' :
                                                platform === 'facebook_reels' ? 'FB Reels' :
                                                'TikTok';
                              
                              const statusColor = variant.variant_status === 'rendered' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                variant.variant_status === 'rendering' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                variant.variant_status === 'failed' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                'bg-muted';
                              
                              return (
                                <Badge key={platform} variant="outline" className={`text-xs ${statusColor}`}>
                                  {displayName}: {variant.variant_status}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Show script editor button if script_draft exists */}
                      {job.script_draft ? (
                        <Button
                          variant={job.status === 'script_ready' ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleOpenScriptEditor(job)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {job.script_approved ? 'View Script' : job.status === 'script_ready' ? 'Review Script' : 'View Script'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateScript(job.id)}
                          className="text-muted-foreground"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Generate Script
                        </Button>
                      )}
                      
                      {/* Fallback: show scene prompts if no script_draft but scene_prompts exist */}
                      {!job.script_draft && job.scene_prompts && Array.isArray(job.scene_prompts) && job.scene_prompts.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              View Scenes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Video Script</DialogTitle>
                              <DialogDescription>8-scene script for this video</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {(job.scene_prompts as any[]).map((scene: any, idx: number) => (
                                <div key={idx} className="border-l-2 border-primary pl-4 py-2">
                                  <h4 className="font-semibold text-sm text-muted-foreground">Scene {idx + 1}</h4>
                                  <p className="text-sm mt-1">{scene.narration_line || scene.prompt_for_veo || "No script available"}</p>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {job.compliance_report && typeof job.compliance_report === 'object' && (job.compliance_report as any).issues && (
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-2">Compliance Adjustments:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {((job.compliance_report as any).issues as any[]).map((issue: any, idx: number) => (
                          <li key={idx}>• {issue.fix || issue.description}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Script Editor Modal */}
      {selectedJob && (
        <ScriptEditorModal
          open={scriptModalOpen}
          onClose={() => {
            setScriptModalOpen(false);
            setSelectedJob(null);
            loadJobs(); // Refresh to get latest script from database
          }}
          jobId={selectedJob.id}
          scriptDraft={selectedJob.script_draft || null}
          ctaCustom={selectedJob.cta_custom || null}
          scriptApproved={selectedJob.script_approved || null}
          autopilotEnabled={selectedJob.autopilot_enabled || null}
          onApproved={handleScriptApproved}
        />
      )}
    </DashboardLayout>
  );
}
