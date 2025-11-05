import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook';

export default function Schedule() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [autoPost, setAutoPost] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!userData) return;
      setOrgId(userData.org_id);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('active_platforms, auto_generate_daily, auto_post_daily')
        .eq('id', userData.org_id)
        .single();

      if (orgData) {
        const validPlatforms = (orgData.active_platforms || []).filter(
          (p): p is Platform => ['tiktok', 'instagram', 'youtube', 'facebook'].includes(p)
        );
        setPlatforms(validPlatforms);
        setAutoGenerate(orgData.auto_generate_daily || false);
        setAutoPost(orgData.auto_post_daily || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePlatform = async (platform: Platform, enabled: boolean) => {
    if (!orgId) return;

    const newPlatforms = enabled
      ? [...platforms, platform]
      : platforms.filter(p => p !== platform);

    setPlatforms(newPlatforms);

    const { error } = await supabase
      .from('organizations')
      .update({ active_platforms: newPlatforms })
      .eq('id', orgId);

    if (error) {
      console.error('Error updating platforms:', error);
      toast({
        title: "Error",
        description: "Failed to update platform settings",
        variant: "destructive",
      });
      // Revert on error
      setPlatforms(platforms);
    } else {
      toast({
        title: "Saved",
        description: `${platform} ${enabled ? 'enabled' : 'disabled'}`,
      });
    }
  };

  const updateAutomation = async (field: 'auto_generate_daily' | 'auto_post_daily', value: boolean) => {
    if (!orgId) return;

    if (field === 'auto_generate_daily') {
      setAutoGenerate(value);
    } else {
      setAutoPost(value);
    }

    const { error } = await supabase
      .from('organizations')
      .update({ [field]: value })
      .eq('id', orgId);

    if (error) {
      console.error('Error updating automation:', error);
      toast({
        title: "Error",
        description: "Failed to update automation settings",
        variant: "destructive",
      });
      // Revert on error
      if (field === 'auto_generate_daily') {
        setAutoGenerate(!value);
      } else {
        setAutoPost(!value);
      }
    } else {
      toast({
        title: "Saved",
        description: `${field === 'auto_generate_daily' ? 'Auto-generation' : 'Auto-posting'} ${value ? 'enabled' : 'disabled'}`,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schedule & Posting</h1>
          <p className="text-muted-foreground mt-1">Manage automatic posting to social platforms</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Active Platforms</CardTitle>
            <CardDescription>Videos will be scheduled to these platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="tiktok">TikTok</Label>
                <p className="text-sm text-muted-foreground">Post to TikTok automatically</p>
              </div>
              <Switch 
                id="tiktok" 
                checked={platforms.includes('tiktok')}
                onCheckedChange={(checked) => updatePlatform('tiktok', checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="instagram">Instagram Reels</Label>
                <p className="text-sm text-muted-foreground">Post to Instagram Reels</p>
              </div>
              <Switch 
                id="instagram" 
                checked={platforms.includes('instagram')}
                onCheckedChange={(checked) => updatePlatform('instagram', checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="youtube">YouTube Shorts</Label>
                <p className="text-sm text-muted-foreground">Post to YouTube Shorts</p>
              </div>
              <Switch 
                id="youtube" 
                checked={platforms.includes('youtube')}
                onCheckedChange={(checked) => updatePlatform('youtube', checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="facebook">Facebook Reels</Label>
                <p className="text-sm text-muted-foreground">Post to Facebook Reels</p>
              </div>
              <Switch 
                id="facebook" 
                checked={platforms.includes('facebook')}
                onCheckedChange={(checked) => updatePlatform('facebook', checked)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>Configure daily video generation and posting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-gen">Auto-generate daily video</Label>
                <p className="text-sm text-muted-foreground">Create a new video every day</p>
              </div>
              <Switch 
                id="auto-gen" 
                checked={autoGenerate}
                onCheckedChange={(checked) => updateAutomation('auto_generate_daily', checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-post">Auto-post daily</Label>
                <p className="text-sm text-muted-foreground">Automatically schedule videos to platforms</p>
              </div>
              <Switch 
                id="auto-post" 
                checked={autoPost}
                onCheckedChange={(checked) => updateAutomation('auto_post_daily', checked)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No scheduled posts yet</p>
            <p className="text-sm text-muted-foreground">Finished videos will appear here for scheduling</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
