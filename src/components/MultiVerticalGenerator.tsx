import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MultiVerticalGeneratorProps {
  selectedVerticals: string[];
  orgId: string;
  onSuccess: () => void;
  onClose: () => void;
  open: boolean;
}

export function MultiVerticalGenerator({
  selectedVerticals,
  orgId,
  onSuccess,
  onClose,
  open
}: MultiVerticalGeneratorProps) {
  const { toast } = useToast();
  const [useMarketBrain, setUseMarketBrain] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);

  const creditsPerVideo = 2; // Updated: only script generation cost initially
  const totalCredits = selectedVerticals.length * creditsPerVideo;

  useEffect(() => {
    if (open && orgId) {
      loadCredits();
    }
  }, [open, orgId]);

  const loadCredits = async () => {
    const { data } = await supabase
      .from('credits_wallet')
      .select('current_credits')
      .eq('org_id', orgId)
      .single();
    
    if (data) {
      setCredits(data.current_credits);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResults(null);

    // Immediate feedback
    toast({
      title: "Starting video generation",
      description: `Queuing ${selectedVerticals.length} video${selectedVerticals.length > 1 ? 's' : ''} for production...`,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('create-vertical-jobs', {
        body: {
          verticals: selectedVerticals,
          useMarketBrain
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      setResults(data);

      if (data.success) {
        toast({
          title: "Videos queued successfully",
          description: `Created ${data.created} video jobs. Total credits: ${data.totalCreditsCharged}`,
        });
        
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        toast({
          title: "Partial success",
          description: `Created ${data.created} jobs, ${data.failed} failed`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating videos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate videos",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const hasEnoughCredits = credits !== null && credits >= totalCredits;
  const willPartiallyGenerate = credits !== null && credits > 0 && credits < totalCredits;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !generating && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Generate Videos for {selectedVerticals.length} Industries
          </DialogTitle>
          <DialogDescription>
            Create targeted viral videos for each selected vertical
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected verticals */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Selected Industries</Label>
            <div className="flex flex-wrap gap-2">
              {selectedVerticals.map((vertical) => (
                <Badge key={vertical} variant="secondary">
                  {vertical}
                </Badge>
              ))}
            </div>
          </div>

          {/* Credit balance */}
          {credits !== null && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Your credit balance:</span>
                <span className={`font-medium ${hasEnoughCredits ? "text-green-600" : "text-destructive"}`}>
                  {credits} credits
                </span>
              </div>
            </div>
          )}

          {/* Warnings */}
          {!hasEnoughCredits && willPartiallyGenerate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have {credits} credits. Some videos won't be created. Add credits in Billing or reduce selections.
              </AlertDescription>
            </Alert>
          )}

          {credits !== null && credits < creditsPerVideo && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient credits. You need at least {creditsPerVideo} credits to generate one video. 
                Please add credits in the Billing section.
              </AlertDescription>
            </Alert>
          )}

          {/* Market Brain toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="market-brain" className="text-base font-medium">
                Use Market Brain Insights
              </Label>
              <p className="text-sm text-muted-foreground">
                Generate videos using your saved market intelligence and positioning
              </p>
            </div>
            <Switch
              id="market-brain"
              checked={useMarketBrain}
              onCheckedChange={setUseMarketBrain}
              disabled={generating}
            />
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-2">
              {results.results?.map((result: any) => (
                <div key={result.vertical} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{result.vertical}</span>
                    {result.insightUsed && (
                      <Badge variant="outline" className="text-xs">
                        Market Brain
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground">{result.brandLabel}</span>
                </div>
              ))}
              {results.errors?.map((error: any) => (
                <div key={error.vertical} className="flex items-center justify-between text-sm p-2 bg-destructive/10 rounded">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span>{error.vertical}</span>
                  </div>
                  <span className="text-destructive text-xs">{error.error}</span>
                </div>
              ))}
            </div>
          )}

          {generating && (
            <div className="space-y-2">
              <Progress value={33} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Creating video jobs...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || (credits !== null && credits < creditsPerVideo)}
              className="bg-accent hover:bg-accent-hover"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {selectedVerticals.length} Videos
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
