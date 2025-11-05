import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BrandFormProps {
  orgId: string;
  brand?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BrandForm({ orgId, brand, onSuccess, onCancel }: BrandFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: brand?.name || "",
    brand_domain: brand?.brand_domain || "",
    product_service: brand?.product_service || "",
    cta_voice_line: brand?.cta_voice_line || "Try A-I Agents two-four-seven dot C-A",
    tone_profile: brand?.tone_profile || "professional",
    allow_captions: brand?.allow_captions || false,
    target_platforms: brand?.target_platforms || [],
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.product_service) {
      toast({
        title: "Error",
        description: "Please select a product/service for this brand",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (brand?.id) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update(formData)
          .eq('id', brand.id);

        if (error) throw error;
        toast({ title: "Brand updated successfully" });
      } else {
        // Create new brand
        const { error } = await supabase
          .from('brands')
          .insert([{ ...formData, org_id: orgId }]);

        if (error) throw error;
        toast({ title: "Brand created successfully" });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: "Error",
        description: "Failed to save brand",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      target_platforms: prev.target_platforms.includes(platform)
        ? prev.target_platforms.filter(p => p !== platform)
        : [...prev.target_platforms, platform]
    }));
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <h4 className="font-semibold text-lg">{brand ? 'Edit Brand' : 'New Brand'}</h4>
      
      <div className="space-y-2">
        <Label htmlFor="brand-name">Brand Name *</Label>
        <Input
          id="brand-name"
          placeholder="e.g., AIAgents247"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand-domain">Brand Domain</Label>
        <Input
          id="brand-domain"
          placeholder="e.g., AIAgents247.ca"
          value={formData.brand_domain}
          onChange={(e) => setFormData({ ...formData, brand_domain: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand-product">Product/Service *</Label>
        <Select 
          value={formData.product_service} 
          onValueChange={(value) => setFormData({ ...formData, product_service: value })}
        >
          <SelectTrigger id="brand-product">
            <SelectValue placeholder="Select a product..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_receptionist">AI Receptionist</SelectItem>
            <SelectItem value="ai_cold_calling">AI Cold Calling</SelectItem>
            <SelectItem value="ai_video_factory">AI Viral Video Factory 247</SelectItem>
            <SelectItem value="autoposter247">AutoPoster 247</SelectItem>
            <SelectItem value="ai_realtors247">AI Realtors 247</SelectItem>
            <SelectItem value="ai_lawyers247">AI Lawyers 247</SelectItem>
            <SelectItem value="custom_campaigns">Custom Client Campaigns</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand-cta">CTA Voice Line</Label>
        <Input
          id="brand-cta"
          placeholder="Spoken at end of video"
          value={formData.cta_voice_line}
          onChange={(e) => setFormData({ ...formData, cta_voice_line: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand-tone">Tone Profile</Label>
        <Select 
          value={formData.tone_profile} 
          onValueChange={(value) => setFormData({ ...formData, tone_profile: value })}
        >
          <SelectTrigger id="brand-tone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cinematic">Cinematic</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="brand-captions">Allow Burned-In Captions</Label>
          <p className="text-sm text-muted-foreground">Show subtitles on the video</p>
        </div>
        <Switch
          id="brand-captions"
          checked={formData.allow_captions}
          onCheckedChange={(checked) => setFormData({ ...formData, allow_captions: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label>Target Platforms</Label>
        <div className="grid grid-cols-2 gap-2">
          {['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook Reels'].map((platform) => (
            <div key={platform} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-platform-${platform}`}
                checked={formData.target_platforms.includes(platform)}
                onCheckedChange={() => togglePlatform(platform)}
              />
              <Label htmlFor={`brand-platform-${platform}`} className="cursor-pointer text-sm">
                {platform}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-accent hover:bg-accent-hover">
          {saving ? "Saving..." : (brand ? "Update Brand" : "Create Brand")}
        </Button>
      </div>
    </div>
  );
}
