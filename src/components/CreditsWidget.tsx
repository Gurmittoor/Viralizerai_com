import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreditsWidgetProps {
  orgId: string | null;
}

export function CreditsWidget({ orgId }: CreditsWidgetProps) {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      loadCreditsData();
    }
  }, [orgId]);

  const loadCreditsData = async () => {
    if (!orgId) return;

    try {
      const [walletResult, usageResult, orgResult] = await Promise.all([
        supabase.from("credits_wallet").select("*").eq("org_id", orgId).single(),
        supabase.from("org_usage").select("*").eq("org_id", orgId).single(),
        supabase.from("organizations").select("memory_allocation_mb, memory_used_mb").eq("id", orgId).single(),
      ]);

      if (walletResult.data) setWallet(walletResult.data);
      if (usageResult.data) setUsage(usageResult.data);
      if (orgResult.data) setOrg(orgResult.data);
    } catch (error) {
      console.error("Error loading credits:", error);
    } finally {
      setLoading(false);
    }
  };

  const buyCredits = async (planKey: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planKey },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Opening checkout...",
          description: "Complete your purchase in the new tab.",
        });
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Checkout failed",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || !wallet) {
    return (
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading credits...</div>
        </CardContent>
      </Card>
    );
  }

  const creditsPercent = (wallet.current_credits / wallet.plan_allocation) * 100;
  const memoryPercent = org ? (org.memory_used_mb / org.memory_allocation_mb) * 100 : 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          Credits & Usage
        </CardTitle>
        <CardDescription>Your current balance and consumption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credits Balance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Credits Remaining</span>
              <Badge variant="secondary">{Math.floor(wallet.current_credits)}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              of {wallet.plan_allocation} monthly
            </span>
          </div>
          <Progress value={creditsPercent} className="h-2" />
        </div>

        {/* Memory Usage */}
        {org && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage Used</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {org.memory_used_mb.toFixed(1)} / {org.memory_allocation_mb} MB
              </span>
            </div>
            <Progress value={memoryPercent} className="h-2" />
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Videos Generated</div>
              <div className="text-xl font-bold">{usage.total_videos_generated}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Credits Used</div>
              <div className="text-xl font-bold">{Math.floor(wallet.credits_used)}</div>
            </div>
          </div>
        )}

        {/* Purchase Buttons */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">Top-Up Credits (1¢ = 1 credit)</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => buyCredits('mini')}
              className="flex flex-col h-auto py-3"
            >
              <span className="text-xs text-muted-foreground mb-1">Mini</span>
              <span className="text-lg font-bold">500</span>
              <span className="text-xs text-muted-foreground">$5</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => buyCredits('standard')}
              className="flex flex-col h-auto py-3"
            >
              <span className="text-xs text-muted-foreground mb-1">Standard</span>
              <span className="text-lg font-bold">2000</span>
              <span className="text-xs text-muted-foreground">$20</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => buyCredits('power')}
              className="flex flex-col h-auto py-3"
            >
              <span className="text-xs text-muted-foreground mb-1">Power</span>
              <span className="text-lg font-bold">5000</span>
              <span className="text-xs text-muted-foreground">$50</span>
            </Button>
          </div>
        </div>

        {/* Next Reset */}
        <div className="text-xs text-center text-muted-foreground pt-2">
          Monthly allocation resets on {new Date(wallet.next_reset).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
