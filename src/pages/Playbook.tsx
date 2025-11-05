import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { BrandForm } from "@/components/BrandForm";
import { MarketBrainSection } from "@/components/MarketBrainSection";
import { MultiVerticalGenerator } from "@/components/MultiVerticalGenerator";

export default function Playbook() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    service_area: "",
    offer: "",
    cta_voice_line: "Try A-I Agents two-four-seven dot C-A",
    brand_domain: "AIAgents247.ca",
    tone_profile: "professional",
    allow_captions: false,
    target_verticals: [] as string[],
    allow_external_clients: true,
    allow_internal_brands: true,
    legal_content_only: true,
    knowledge_base_urls: [] as string[],
    auto_generate_daily: false,
    platform_optimize: true,
    autopilot_enabled: false,
  });
  const [forbiddenClaims, setForbiddenClaims] = useState<string[]>([]);
  const [newClaim, setNewClaim] = useState("");
  const [newKnowledgeUrl, setNewKnowledgeUrl] = useState("");
  const [newVertical, setNewVertical] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [customIndustry, setCustomIndustry] = useState("");
  const [showMultiVerticalGen, setShowMultiVerticalGen] = useState(false);
  const [useMarketBrain, setUseMarketBrain] = useState(true);

  useEffect(() => {
    loadPlaybook();
  }, []);

  const loadPlaybook = async () => {
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
        
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userData.org_id)
          .single();

        if (org) {
          const industryValue = org.industry || "";
          const isCustomIndustry = !['plumber', 'hvac', 'roofing', 'towing', 'septic', 'electrical'].includes(industryValue);
          
          setFormData({
            name: org.name || "",
            industry: isCustomIndustry && industryValue ? "other" : industryValue,
            service_area: org.service_area || "",
            offer: org.offer || "",
            cta_voice_line: org.cta_voice_line || "Try A-I Agents two-four-seven dot C-A",
            brand_domain: org.brand_domain || "AIAgents247.ca",
            tone_profile: org.tone_profile || "professional",
            allow_captions: org.allow_captions || false,
            target_verticals: org.target_verticals || [],
            allow_external_clients: org.allow_external_clients ?? true,
            allow_internal_brands: org.allow_internal_brands ?? true,
            legal_content_only: org.legal_content_only ?? true,
            knowledge_base_urls: org.knowledge_base_urls || [],
            auto_generate_daily: org.auto_generate_daily || false,
            platform_optimize: (org as any).platform_optimize ?? true,
            autopilot_enabled: (org as any).autopilot_enabled ?? false,
          });
          setForbiddenClaims(org.forbidden_claims || []);
          
          // Set custom industry if it's not a predefined value
          if (isCustomIndustry && industryValue) {
            setCustomIndustry(industryValue);
          }
        }

        // Load brands
        const { data: brandsData } = await supabase
          .from('brands')
          .select('*')
          .eq('org_id', userData.org_id)
          .order('created_at', { ascending: false });
        
        if (brandsData) {
          setBrands(brandsData);
        }
      }
    } catch (error) {
      console.error('Error loading playbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      // Use custom industry if "other" is selected
      const industryValue = formData.industry === "other" && customIndustry.trim() 
        ? customIndustry.trim() 
        : formData.industry;

      const { error } = await supabase
        .from('organizations')
        .update({
          ...formData,
          industry: industryValue,
          forbidden_claims: forbiddenClaims,
          platform_optimize: formData.platform_optimize,
          autopilot_enabled: formData.autopilot_enabled,
        })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: "Playbook saved",
        description: "Your brand settings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save playbook settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addForbiddenClaim = () => {
    if (newClaim.trim() && !forbiddenClaims.includes(newClaim.trim())) {
      setForbiddenClaims([...forbiddenClaims, newClaim.trim()]);
      setNewClaim("");
    }
  };

  const removeForbiddenClaim = (claim: string) => {
    setForbiddenClaims(forbiddenClaims.filter(c => c !== claim));
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const toggleVertical = (vertical: string) => {
    setFormData(prev => ({
      ...prev,
      target_verticals: prev.target_verticals.includes(vertical)
        ? prev.target_verticals.filter(v => v !== vertical)
        : [...prev.target_verticals, vertical]
    }));
  };

  const addCustomVertical = () => {
    if (newVertical.trim() && !formData.target_verticals.includes(newVertical.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        target_verticals: [...prev.target_verticals, newVertical.trim().toLowerCase()]
      }));
      setNewVertical("");
    }
  };

  const removeVertical = (vertical: string) => {
    setFormData(prev => ({
      ...prev,
      target_verticals: prev.target_verticals.filter(v => v !== vertical)
    }));
  };

  const addKnowledgeUrl = () => {
    if (newKnowledgeUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        knowledge_base_urls: [...prev.knowledge_base_urls, newKnowledgeUrl.trim()]
      }));
      setNewKnowledgeUrl('');
    }
  };

  const removeKnowledgeUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      knowledge_base_urls: prev.knowledge_base_urls.filter((_, i) => i !== index)
    }));
  };

  const deleteBrand = async (brandId: string) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      setBrands(brands.filter(b => b.id !== brandId));
      toast({ title: "Brand deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete brand", variant: "destructive" });
    }
  };

  const handleBrandSuccess = () => {
    setShowBrandForm(false);
    setEditingBrand(null);
    loadPlaybook();
  };

  if (loading) {
    return <DashboardLayout><div className="text-center py-12">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Brand Playbook</h1>
          <p className="text-muted-foreground mt-1">Configure your brand voice and compliance rules</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Tell us about your service business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select 
                  value={formData.industry} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, industry: value });
                    if (value !== "other") {
                      setCustomIndustry("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumber">Plumbing</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="towing">Towing</SelectItem>
                    <SelectItem value="septic">Septic</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.industry === "other" && (
                  <Input
                    id="custom-industry"
                    placeholder="Enter your industry (e.g., Landscaping, Auto Repair, etc.)"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_area">Service Area</Label>
              <Input
                id="service_area"
                placeholder="e.g., Greater Toronto Area, Calgary, etc."
                value={formData.service_area}
                onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer">Main Offer/Guarantee</Label>
              <Input
                id="offer"
                placeholder="e.g., 24/7 Emergency Service, Free Quote"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Brand Voice</CardTitle>
            <CardDescription>How should your videos sound and feel?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone Profile</Label>
              <Select value={formData.tone_profile} onValueChange={(value) => setFormData({ ...formData, tone_profile: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="funny">Funny</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">CTA Voice Line (spoken at end)</Label>
              <Input
                id="cta"
                value={formData.cta_voice_line}
                onChange={(e) => setFormData({ ...formData, cta_voice_line: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Brand Domain</Label>
              <Input
                id="domain"
                value={formData.brand_domain}
                onChange={(e) => setFormData({ ...formData, brand_domain: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="captions">Allow Burned-In Captions</Label>
                <p className="text-sm text-muted-foreground">Show subtitles on the video itself</p>
              </div>
              <Switch
                id="captions"
                checked={formData.allow_captions}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_captions: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Forbidden Claims</CardTitle>
            <CardDescription>What should we never say in your videos?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Common Forbidden Claims (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Don't promise specific arrival times",
                  "Don't claim to be licensed if not verified",
                  "Don't guarantee specific results",
                  "Don't use competitor names",
                  "Don't mention pricing without disclaimer",
                  "Don't claim to be 'the best' without proof",
                  "Don't make medical or health claims",
                  "Don't promise same-day service",
                  "Don't claim '24/7' availability unless true",
                  "Don't use absolute terms (always, never, guaranteed)",
                ].map((claim) => (
                  <div key={claim} className="flex items-center space-x-2">
                    <Checkbox
                      id={`claim-${claim}`}
                      checked={forbiddenClaims.includes(claim)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setForbiddenClaims([...forbiddenClaims, claim]);
                        } else {
                          setForbiddenClaims(forbiddenClaims.filter(c => c !== claim));
                        }
                      }}
                    />
                    <Label htmlFor={`claim-${claim}`} className="cursor-pointer text-sm font-normal">
                      {claim}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label>Add Custom Forbidden Claim</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., don't say 'emergency service' or mention specific brands"
                  value={newClaim}
                  onChange={(e) => setNewClaim(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addForbiddenClaim())}
                />
                <Button onClick={addForbiddenClaim} variant="outline">Add</Button>
              </div>
            </div>

            {forbiddenClaims.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label>Selected Forbidden Claims ({forbiddenClaims.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {forbiddenClaims.map((claim) => (
                    <Badge key={claim} variant="secondary" className="gap-1">
                      {claim}
                      <button onClick={() => removeForbiddenClaim(claim)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Product & Scope</CardTitle>
            <CardDescription>What services do you provide and offer to clients?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Common Target Verticals (Select all that apply)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 border rounded-lg p-4">
                  {[
                    'Realtors', 
                    'Lawyers', 
                    'Plumbers', 
                    'HVAC', 
                    'Roofers', 
                    'Towing', 
                    'Electricians', 
                    'Septic',
                    'Garage Door Repair',
                    'Pest Control',
                    'Tree Removal',
                    'Asphalt & Paving',
                    'Mobile Auto Detailing',
                    'Landscaping',
                    'Pool Service',
                    'Carpet Cleaning',
                    'Window Cleaning',
                    'Junk Removal',
                    'Moving Services',
                    'Locksmiths',
                    'Appliance Repair',
                    'House Cleaning',
                    'Painting',
                    'Flooring',
                    'Gutters',
                    'Fencing',
                    'Concrete',
                    'Pressure Washing',
                    'Snow Removal',
                    'Handyman',
                    'Auto Repair',
                    'Glass Repair',
                    'Chimney Service'
                  ].map((vertical) => (
                    <div key={vertical} className="flex items-center space-x-2">
                      <Checkbox
                        id={`vertical-${vertical}`}
                        checked={formData.target_verticals.includes(vertical.toLowerCase())}
                        onCheckedChange={() => toggleVertical(vertical.toLowerCase())}
                      />
                      <Label htmlFor={`vertical-${vertical}`} className="cursor-pointer text-sm font-normal">{vertical}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label>Add Custom Vertical</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Dental Clinics, Pet Grooming, Wedding Photographers"
                    value={newVertical}
                    onChange={(e) => setNewVertical(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomVertical())}
                  />
                  <Button onClick={addCustomVertical} variant="outline">Add</Button>
                </div>
              </div>

              {formData.target_verticals.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label>Selected Verticals ({formData.target_verticals.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.target_verticals.map((vertical) => (
                      <Badge key={vertical} variant="secondary" className="gap-1 capitalize">
                        {vertical}
                        <button onClick={() => removeVertical(vertical)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Serve External Clients</Label>
                <p className="text-sm text-muted-foreground">Can create videos for outside clients</p>
              </div>
              <Switch
                checked={formData.allow_external_clients}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_external_clients: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 p-4">
              <div>
                <Label className="text-accent font-semibold">✅ Legal-Purpose Only</Label>
                <p className="text-sm text-muted-foreground">All videos enforced for legal compliance globally</p>
              </div>
              <Badge variant="secondary" className="bg-accent/10 text-accent">Always Enforced</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Add your website, blog, or competitor sites. AI will analyze these to create targeted viral videos for your market.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="knowledge-url">Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="knowledge-url"
                  type="url"
                  placeholder="https://example.com or competitor site"
                  value={newKnowledgeUrl}
                  onChange={(e) => setNewKnowledgeUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKnowledgeUrl())}
                />
                <Button type="button" onClick={addKnowledgeUrl} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Add your site, blog, or competitors to generate market-targeted content</p>
            </div>

            {formData.knowledge_base_urls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Added URLs ({formData.knowledge_base_urls.length})</Label>
                <div className="space-y-2">
                  {formData.knowledge_base_urls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md group hover:bg-muted transition-colors">
                      <span className="text-sm truncate flex-1 mr-2">{url}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKnowledgeUrl(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {orgId && <MarketBrainSection orgId={orgId} />}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Generate Daily Content</CardTitle>
            <CardDescription>Create targeted viral videos for your selected industries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="use-market-brain" className="text-base font-medium">
                  Use Market Brain Insights
                </Label>
                <p className="text-sm text-muted-foreground">
                  We'll talk like you, using your website/competitors. If off, we use generic industry scripts.
                </p>
              </div>
              <Switch
                id="use-market-brain"
                checked={useMarketBrain}
                onCheckedChange={setUseMarketBrain}
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => setShowMultiVerticalGen(true)}
                disabled={formData.target_verticals.length === 0}
                className="w-full bg-accent hover:bg-accent-hover"
                size="lg"
              >
                Generate 1 Video Per Selected Vertical
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Videos are added to Pipeline and Library and queued for posting.
              </p>
              {formData.target_verticals.length === 0 && (
                <p className="text-sm text-destructive text-center">
                  Please select at least one target vertical above.
                </p>
              )}
              {formData.target_verticals.length > 0 && (
                <p className="text-sm text-accent text-center font-medium">
                  {formData.target_verticals.length} vertical{formData.target_verticals.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Target Platforms</CardTitle>
            <CardDescription>Where should we post your videos?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook Reels'].map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Switch
                    id={platform}
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={() => togglePlatform(platform)}
                  />
                  <Label htmlFor={platform}>{platform}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate Daily Content */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Generate Daily Content</CardTitle>
            <CardDescription>
              Automatically create videos across your selected verticals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-generate"
                checked={formData.auto_generate_daily}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_generate_daily: checked }))}
              />
              <Label htmlFor="auto-generate" className="cursor-pointer">
                Auto-generate 1 video per vertical daily
              </Label>
            </div>

            {/* Platform Optimization Section */}
            <div className="border-t pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Platform Optimization</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically customize each video for TikTok, YouTube Shorts, Instagram Reels, and Facebook Reels using each platform's current viral style.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="platform-optimize"
                    checked={formData.platform_optimize !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, platform_optimize: checked }))}
                  />
                  <Label htmlFor="platform-optimize" className="cursor-pointer">
                    Generate platform-optimized versions for all selected posting platforms
                  </Label>
                </div>

                {formData.platform_optimize !== false && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-medium">Credit Cost Breakdown:</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Base video: <span className="font-medium">120 credits</span> per vertical</li>
                      <li>• Per platform variant: <span className="font-medium">+10 credits</span> each</li>
                    </ul>
                    {formData.target_verticals.length > 0 && selectedPlatforms.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="text-sm font-semibold">
                          Example: {formData.target_verticals.length} vertical{formData.target_verticals.length > 1 ? 's' : ''} × {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} = 
                          <span className="ml-1 text-accent">
                            {formData.target_verticals.length * 120 + formData.target_verticals.length * selectedPlatforms.length * 10} credits
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ({formData.target_verticals.length} base video{formData.target_verticals.length > 1 ? 's' : ''} + {formData.target_verticals.length * selectedPlatforms.length} platform variant{formData.target_verticals.length * selectedPlatforms.length > 1 ? 's' : ''})
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content Automation Mode */}
            <div className="border-t pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Content Automation Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose whether to review scripts manually before production or let the system auto-approve them.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autopilot"
                    checked={formData.autopilot_enabled !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autopilot_enabled: checked }))}
                  />
                  <Label htmlFor="autopilot" className="cursor-pointer">
                    {formData.autopilot_enabled ? 'Autopilot Mode: Scripts auto-approved' : 'Manual Mode: Review each script before production'}
                  </Label>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="text-sm">
                    {formData.autopilot_enabled ? (
                      <>
                        <p className="font-medium text-success">Autopilot is enabled</p>
                        <p className="text-muted-foreground mt-1">Scripts will be automatically approved and sent directly to video production.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Manual review required</p>
                        <p className="text-muted-foreground mt-1">You'll review and approve each script in the Pipeline before rendering starts. Script generation costs 2 credits; production costs 120+ credits only after approval.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Brands & Campaigns</CardTitle>
              <CardDescription>Manage multiple brands under your organization</CardDescription>
            </div>
            <Button 
              onClick={() => {
                setShowBrandForm(!showBrandForm);
                setEditingBrand(null);
              }} 
              size="sm"
              variant={showBrandForm ? "outline" : "default"}
            >
              {showBrandForm ? "Cancel" : <><Plus className="w-4 h-4 mr-2" />Add Brand</>}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {(showBrandForm || editingBrand) && orgId && (
              <BrandForm
                orgId={orgId}
                brand={editingBrand}
                onSuccess={handleBrandSuccess}
                onCancel={() => {
                  setShowBrandForm(false);
                  setEditingBrand(null);
                }}
              />
            )}

            {brands.length === 0 && !showBrandForm && !editingBrand && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No brands added yet. Click "Add Brand" to create your first brand.
              </p>
            )}

            {!showBrandForm && !editingBrand && brands.length > 0 && (
              <div className="space-y-2">
                {brands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{brand.name}</p>
                      <p className="text-sm text-muted-foreground">{brand.brand_domain || 'No domain set'}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{brand.tone_profile}</Badge>
                        {brand.target_platforms?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {brand.target_platforms.length} platforms
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setEditingBrand(brand);
                          setShowBrandForm(false);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          if (confirm(`Delete brand "${brand.name}"?`)) {
                            deleteBrand(brand.id);
                          }
                        }}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            size="lg" 
            className="bg-accent hover:bg-accent-hover"
          >
            {saving ? "Saving..." : "Save Playbook"}
          </Button>
        </div>

        {showMultiVerticalGen && orgId && (
          <MultiVerticalGenerator
            selectedVerticals={formData.target_verticals.map(v => v.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))}
            orgId={orgId}
            onSuccess={loadPlaybook}
            onClose={() => setShowMultiVerticalGen(false)}
            open={showMultiVerticalGen}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
