import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      
      const { data: userData } = await supabase
        .from('users')
        .select('role, org_id')
        .eq('id', user.id)
        .single();

      if (userData) {
        setRole(userData.role);
        
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', userData.org_id)
          .single();

        if (orgData) {
          setOrgName(orgData.name);
        }
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">Organization</Label>
              <Input id="org" value={orgName} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} disabled className="capitalize" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Manage your account session</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSignOut} 
              variant="outline" 
              className="w-full md:w-auto"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full md:w-auto">
              Request Account Deletion
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
