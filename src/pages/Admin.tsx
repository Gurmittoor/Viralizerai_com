import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Admin() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System-wide oversight and controls</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl">0</CardTitle>
              <CardDescription>Total Organizations</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl">0</CardTitle>
              <CardDescription>Videos Generated Today</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-2xl">0</CardTitle>
              <CardDescription>Flagged For Review</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Policy Updates</CardTitle>
            <CardDescription>Recent compliance rule changes</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No policy updates logged</p>
            <p className="text-sm text-muted-foreground">The system will track policy changes here</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
