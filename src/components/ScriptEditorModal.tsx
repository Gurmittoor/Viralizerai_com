import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, AlertCircle, Sparkles, Zap, Clock, Target, Film } from "lucide-react";

interface ScriptEditorModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  scriptDraft: string | null;
  ctaCustom: string | null;
  scriptApproved: boolean | null;
  autopilotEnabled: boolean | null;
  onApproved: () => void;
}

// Helper function to fix script timing to 8×8 format
const fixScriptTiming = (scriptText: string): { fixed: string; changed: boolean } => {
  try {
    const scriptJson = JSON.parse(scriptText);
    
    if (!scriptJson.scenes || !Array.isArray(scriptJson.scenes)) {
      return { fixed: scriptText, changed: false };
    }

    const requiredDurations = [
      '0-8s', '8-16s', '16-24s', '24-32s',
      '32-40s', '40-48s', '48-56s', '56-64s'
    ];

    let changed = false;

    // Fix scene count if not exactly 8
    if (scriptJson.scenes.length !== 8) {
      changed = true;
      // Truncate or pad to 8 scenes
      if (scriptJson.scenes.length > 8) {
        scriptJson.scenes = scriptJson.scenes.slice(0, 8);
      } else {
        // Add placeholder scenes
        while (scriptJson.scenes.length < 8) {
          const sceneNum = scriptJson.scenes.length + 1;
          scriptJson.scenes.push({
            scene_number: sceneNum,
            duration: requiredDurations[sceneNum - 1],
            visual_prompt: "Continue the narrative flow",
            audio_description: "Continuation of audio",
            caption_text: "..."
          });
        }
      }
    }

    // Fix timing for each scene
    scriptJson.scenes.forEach((scene: any, idx: number) => {
      const correctDuration = requiredDurations[idx];
      if (scene.duration !== correctDuration) {
        scene.duration = correctDuration;
        scene.scene_number = idx + 1;
        changed = true;
      }
    });

    // Fix total duration
    if (scriptJson.total_duration !== '64s') {
      scriptJson.total_duration = '64s';
      changed = true;
    }

    return {
      fixed: JSON.stringify(scriptJson, null, 2),
      changed
    };
  } catch (e) {
    // Not valid JSON, return as-is
    return { fixed: scriptText, changed: false };
  }
};

export function ScriptEditorModal({
  open,
  onClose,
  jobId,
  scriptDraft,
  ctaCustom,
  scriptApproved,
  autopilotEnabled,
  onApproved,
}: ScriptEditorModalProps) {
  const [script, setScript] = useState(scriptDraft || "");
  const [cta, setCta] = useState(ctaCustom || "");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Sync local state with props when they change
  useEffect(() => {
    setScript(scriptDraft || "");
    setCta(ctaCustom || "");
  }, [scriptDraft, ctaCustom]);

  // Auto-fix script timing when modal opens
  useEffect(() => {
    if (scriptDraft && !scriptApproved) {
      const { fixed, changed } = fixScriptTiming(scriptDraft);
      if (changed) {
        setScript(fixed);
        toast({
          title: "Script timing auto-corrected",
          description: "Script has been adjusted to 8×8 format (8 scenes × 8 seconds)",
        });
      }
    }
  }, [scriptDraft, scriptApproved, toast]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("video_jobs")
        .update({
          script_draft: script,
          cta_custom: cta,
        })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Script saved",
        description: "Your changes have been saved as a draft.",
      });
    } catch (error) {
      console.error("Error saving script:", error);
      toast({
        title: "Error",
        description: "Failed to save script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFixTiming = () => {
    const { fixed, changed } = fixScriptTiming(script);
    if (changed) {
      setScript(fixed);
      toast({
        title: "Timing fixed",
        description: "Script adjusted to 8×8 format (8 scenes × 8 seconds each)",
      });
    } else {
      toast({
        title: "No changes needed",
        description: "Script is already in correct 8×8 format",
      });
    }
  };

  const handleGenerateScript = async () => {
    setGenerating(true);
    try {
      const { data: generateData, error: generateError } = await supabase.functions.invoke(
        'generate-script-draft',
        {
          body: { job_id: jobId }
        }
      );

      if (generateError) throw generateError;

      if (!generateData?.success) {
        throw new Error(generateData?.error || 'Script generation failed');
      }

      // Fetch the updated script
      const { data: jobData, error: jobError } = await supabase
        .from("video_jobs")
        .select("script_draft, cta_custom")
        .eq("id", jobId)
        .single();

      if (jobError) throw jobError;

      setScript(jobData.script_draft || "");
      setCta(jobData.cta_custom || "");

      toast({
        title: "Script generated",
        description: "Your script draft is ready for review.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating script:", error);
      
      let errorMessage = "Failed to generate script. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveForProduction = async () => {
    setApproving(true);
    try {
      // First save any pending changes
      const { error: updateError } = await supabase
        .from("video_jobs")
        .update({
          script_draft: script,
          cta_custom: cta,
        })
        .eq("id", jobId);

      if (updateError) throw updateError;

      // STEP 1: Approve the script (fast, just database update)
      const { data: approveData, error: approveError } = await supabase.functions.invoke(
        'approve-script',
        {
          body: { job_id: jobId }
        }
      );

      if (approveError) {
        const errorMessage = approveError.message || approveError.toString();
        throw new Error(errorMessage);
      }

      if (!approveData?.success) {
        throw new Error(approveData?.error || 'Approval failed');
      }

      console.log('✅ Script approved, starting production...');

      // STEP 2: Start video production (renders the video)
      const { data: productionData, error: productionError } = await supabase.functions.invoke(
        'start-production',
        {
          body: { job_id: jobId }
        }
      );

      if (productionError) {
        // Production failed, but script is still approved
        console.error('Production error:', productionError);
        toast({
          title: "Script Approved",
          description: "Script approved but video rendering failed. You can retry from Video Production tab.",
          variant: "destructive",
        });
        onApproved();
        onClose();
        return;
      }

      if (!productionData?.success) {
        throw new Error(productionData?.error || 'Production start failed');
      }

      toast({
        title: "Script approved & rendering started!",
        description: `Video is now rendering. Check Video Production tab to monitor progress.`,
      });
      
      onApproved();
      onClose();
    } catch (error) {
      console.error("Error approving script:", error);
      
      let errorMessage = "Failed to approve script. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for insufficient credits specifically
      if (errorMessage.includes("Insufficient credits") || errorMessage.includes("credits")) {
        errorMessage = errorMessage;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  // Parse scene count from script
  const getSceneCount = () => {
    try {
      const parsed = JSON.parse(script);
      return parsed.scenes?.length || 0;
    } catch {
      return 0;
    }
  };

  const getTotalDuration = () => {
    try {
      const parsed = JSON.parse(script);
      return parsed.total_duration || "64s";
    } catch {
      return "64s";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Script Studio</DialogTitle>
          <DialogDescription>
            Review and customize your video script before production.
            {autopilotEnabled && (
              <span className="block mt-2 text-warning">
                <AlertCircle className="inline w-4 h-4 mr-1" />
                Autopilot is enabled for this job - approval is optional.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6 mt-4 flex-1 overflow-hidden">
          {/* LEFT PANEL - Script Editor */}
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Script Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="script">Video Script</Label>
                {!scriptApproved && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFixTiming}
                      disabled={generating || saving || approving}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Fix 8×8 Timing
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateScript}
                      disabled={generating || saving || approving}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Script
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <Textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Your viral video script..."
                className="min-h-[400px] font-mono text-sm"
                disabled={scriptApproved === true}
              />
              <p className="text-xs text-muted-foreground">
                Edit the hook, body, and flow. Keep it punchy for maximum virality.
              </p>
            </div>

            {/* CTA Editor */}
            <div className="space-y-2">
              <Label htmlFor="cta">Custom Call-to-Action</Label>
              <Input
                id="cta"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Call 416-555-2477 or visit YourBrand.com"
                disabled={scriptApproved === true}
              />
              <p className="text-xs text-muted-foreground">
                This will be added to platform-specific captions and end cards.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL - Production Info & Preview */}
          <div className="space-y-4 border-l pl-4 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Production Overview</h3>
              
              {/* Status Display */}
              {scriptApproved ? (
                <div className="flex items-center gap-2 p-3 bg-success/10 rounded-md border border-success/20">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm font-medium">Script approved and in production</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">Awaiting approval</span>
                </div>
              )}

              {/* Video Specs */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-card rounded-lg border">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-xs text-muted-foreground">{getTotalDuration()} total</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-card rounded-lg border">
                  <Film className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Scenes</p>
                    <p className="text-xs text-muted-foreground">{getSceneCount()} scenes × 8 seconds</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-card rounded-lg border">
                  <Target className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Format</p>
                    <p className="text-xs text-muted-foreground">9:16 vertical (TikTok, Shorts, Reels)</p>
                  </div>
                </div>
              </div>

              {/* Production Pipeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Pipeline Steps</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={script ? "default" : "outline"} className="w-5 h-5 p-0 flex items-center justify-center">
                      {script ? <Check className="w-3 h-3" /> : "1"}
                    </Badge>
                    <span className={script ? "text-foreground" : "text-muted-foreground"}>
                      Script Draft
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={cta ? "default" : "outline"} className="w-5 h-5 p-0 flex items-center justify-center">
                      {cta ? <Check className="w-3 h-3" /> : "2"}
                    </Badge>
                    <span className={cta ? "text-foreground" : "text-muted-foreground"}>
                      CTA Setup
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={scriptApproved ? "default" : "outline"} className="w-5 h-5 p-0 flex items-center justify-center">
                      {scriptApproved ? <Check className="w-3 h-3" /> : "3"}
                    </Badge>
                    <span className={scriptApproved ? "text-foreground" : "text-muted-foreground"}>
                      Approval & Render
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Always visible at bottom */}
        <div className="flex gap-3 justify-end pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          
          {!scriptApproved && (
            <>
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={saving || approving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Draft
              </Button>

              <Button
                onClick={handleApproveForProduction}
                disabled={saving || approving || !script || !cta}
              >
                {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve for Production
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
