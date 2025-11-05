import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditsWidget } from "@/components/CreditsWidget";
import { ProfitabilityDashboard } from "@/components/ProfitabilityDashboard";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, TrendingUp, Package, DollarSign } from "lucide-react";

export default function Billing() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        setOrgId(userData.org_id);

        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", userData.org_id)
          .single();

        if (orgData) setOrg(orgData);

        const { data: eventsData } = await supabase
          .from("usage_events")
          .select("*")
          .eq("org_id", userData.org_id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (eventsData) setEvents(eventsData);
      }
    } catch (error) {
      console.error("Error loading billing:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case "starter": return "secondary";
      case "pro": return "default";
      case "elite": return "destructive";
      default: return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing & Credits</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription, credits, and profitability</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
          {/* Current Plan */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your subscription tier and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {org && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Plan Tier</span>
                    <Badge variant={getPlanColor(org.plan_tier)} className="capitalize">
                      {org.plan_tier}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Auto Generate Daily</span>
                    <Badge variant={org.auto_generate_daily ? "default" : "outline"}>
                      {org.auto_generate_daily ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Auto Post Daily</span>
                    <Badge variant={org.auto_post_daily ? "default" : "outline"}>
                      {org.auto_post_daily ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="pt-4">
                    <Button className="w-full" variant="outline">
                      Upgrade Plan
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

              {/* Credits Widget */}
              <CreditsWidget orgId={orgId} />
            </div>

            {/* Recent Usage */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest credit transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No usage history yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {event.feature.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant={event.credits_cost > 0 ? "secondary" : "default"}
                          className="font-mono"
                        >
                          {event.credits_cost > 0 ? "-" : "+"}
                          {Math.abs(event.credits_cost)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profitability" className="space-y-6">
            <ProfitabilityDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
