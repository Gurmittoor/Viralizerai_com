import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Sparkles, Brain } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ReferenceAd {
  id: string;
  video_url: string;
  script: string | null;
  tone_profile: string;
  performance_score: number;
  structural_pattern: any;
  created_at: string;
  updated_at: string;
}

export default function ReferenceLibrary() {
  const { toast } = useToast();
  const [referenceAds, setReferenceAds] = useState<ReferenceAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<ReferenceAd | null>(null);
  
  // Form state
  const [videoUrl, setVideoUrl] = useState("");
  const [toneProfile, setToneProfile] = useState("professional");
  const [performanceScore, setPerformanceScore] = useState([75]);
  const [script, setScript] = useState("");
  const [autoExtractDNA, setAutoExtractDNA] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        
        // Load reference ads
        const { data: adsData, error } = await supabase
          .from('reference_ads')
          .select('*')
          .eq('org_id', userData.org_id)
          .order('performance_score', { ascending: false });

        if (error) throw error;
        setReferenceAds(adsData || []);
      }
    } catch (error) {
      console.error('Error loading reference library:', error);
      toast({
        title: "Error",
        description: "Failed to load reference ads.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setSubmitting(true);
    try {
      let structuralPattern = null;

      // Auto-extract DNA if enabled
      if (autoExtractDNA) {
        toast({
          title: "Extracting DNA",
          description: "AI is analyzing the video structure...",
        });

        const { data: dnaData, error: dnaError } = await supabase.functions.invoke('extract-ad-dna', {
          body: { video_url: videoUrl }
        });

        if (dnaError) {
          console.error('DNA extraction error:', dnaError);
          toast({
            title: "Warning",
            description: "DNA extraction failed, but ad will be saved without structural pattern.",
          });
        } else {
          structuralPattern = dnaData.structural_pattern;
          if (!toneProfile && dnaData.tone_profile) {
            setToneProfile(dnaData.tone_profile);
          }
        }
      }

      // Insert or update reference ad
      const adData = {
        org_id: orgId,
        video_url: videoUrl,
        tone_profile: toneProfile,
        performance_score: performanceScore[0],
        script: script || null,
        structural_pattern: structuralPattern,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('reference_ads')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;

        toast({
          title: "Updated",
          description: "Reference ad updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('reference_ads')
          .insert(adData);

        if (error) throw error;

        toast({
          title: "Added",
          description: "Reference ad added to your library.",
        });
      }

      // Reset form and reload
      resetForm();
      setAddModalOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving reference ad:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save reference ad.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm("Are you sure you want to delete this reference ad?")) return;

    try {
      const { error } = await supabase
        .from('reference_ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Reference ad removed from library.",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reference ad.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (ad: ReferenceAd) => {
    setEditingAd(ad);
    setVideoUrl(ad.video_url);
    setToneProfile(ad.tone_profile);
    setPerformanceScore([ad.performance_score]);
    setScript(ad.script || "");
    setAutoExtractDNA(false);
    setAddModalOpen(true);
  };

  const resetForm = () => {
    setEditingAd(null);
    setVideoUrl("");
    setToneProfile("professional");
    setPerformanceScore([75]);
    setScript("");
    setAutoExtractDNA(true);
  };

  const getToneBadgeVariant = (tone: string) => {
    switch (tone) {
      case 'professional': return 'default';
      case 'emotional': return 'destructive';
      case 'humorous': return 'secondary';
      default: return 'outline';
    }
  };

  const getToneEmoji = (tone: string) => {
    switch (tone) {
      case 'professional': return '💼';
      case 'emotional': return '❤️';
      case 'humorous': return '😂';
      default: return '🎯';
    }
  };

  const avgPerformance = referenceAds.length > 0
    ? Math.round(referenceAds.reduce((sum, ad) => sum + ad.performance_score, 0) / referenceAds.length)
    : 0;

  if (loading) {
    return <DashboardLayout><div className="text-center py-12">Loading reference library...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reference Library</h1>
          <p className="text-muted-foreground mt-1">Manage benchmark ads that train your Commercial DNA engine</p>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-hero text-white shadow-elevated">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Your Reference Library trains the Commercial DNA engine</h3>
                <p className="text-white/90 text-sm">Add your top 5–10 ads that best represent your brand's viral voice. The AI will compare new viral videos against these benchmarks to find the best clone matches.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reference Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{referenceAds.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgPerformance}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">DNA Training Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-accent" />
                <span className="text-xl font-semibold">{referenceAds.length > 0 ? 'Enabled' : 'Disabled'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Button */}
        <div className="flex justify-end">
          <Dialog open={addModalOpen} onOpenChange={(open) => {
            setAddModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Reference Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAd ? 'Edit Reference Ad' : 'Add Reference Ad'}</DialogTitle>
                <DialogDescription>
                  Add a high-performing ad to train the AI on your brand's viral DNA
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="video_url">Video URL *</Label>
                  <Input
                    id="video_url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tone_profile">Tone Profile *</Label>
                  <Select value={toneProfile} onValueChange={setToneProfile}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">💼 Professional</SelectItem>
                      <SelectItem value="emotional">❤️ Emotional</SelectItem>
                      <SelectItem value="humorous">😂 Humorous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="performance_score">
                    Performance Score: {performanceScore[0]}%
                  </Label>
                  <Slider
                    id="performance_score"
                    min={0}
                    max={100}
                    step={5}
                    value={performanceScore}
                    onValueChange={setPerformanceScore}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="script">Script (Optional)</Label>
                  <Textarea
                    id="script"
                    placeholder="Paste the ad script here..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto_extract"
                    checked={autoExtractDNA}
                    onCheckedChange={(checked) => setAutoExtractDNA(checked as boolean)}
                  />
                  <Label htmlFor="auto_extract" className="text-sm font-normal cursor-pointer">
                    Auto-extract Commercial DNA (AI analyzes structure)
                  </Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (editingAd ? 'Updating...' : 'Adding...') : (editingAd ? 'Update Ad' : 'Add Ad')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setAddModalOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reference Ads Table */}
        {referenceAds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No reference ads yet. Add your first benchmark ad to start training the AI.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Reference Ads Library</CardTitle>
              <CardDescription>Your benchmark videos that define brand DNA</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>DNA Impact</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referenceAds.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <a 
                          href={ad.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {ad.video_url.length > 40 ? ad.video_url.substring(0, 40) + '...' : ad.video_url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getToneBadgeVariant(ad.tone_profile)}>
                          {getToneEmoji(ad.tone_profile)} {ad.tone_profile}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent transition-all" 
                              style={{ width: `${ad.performance_score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{ad.performance_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {ad.structural_pattern ? 'High' : 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ad.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(ad)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(ad.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
