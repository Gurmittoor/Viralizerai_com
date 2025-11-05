import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddTrendingUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTrendingUrlModal({ open, onOpenChange, onSuccess }: AddTrendingUrlModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    platform: "",
    video_url: "",
    title: "",
    category: "",
    view_count: "",
    thumbnail_url: "",
    brand_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('add-trending-url', {
        body: {
          platform: formData.platform,
          video_url: formData.video_url,
          title: formData.title || "Untitled",
          category: formData.category || "general",
          view_count: formData.view_count ? parseInt(formData.view_count) : 0,
          thumbnail_url: formData.thumbnail_url || null,
          brand_notes: formData.brand_notes || null,
        }
      });

      if (error) throw error;

      toast({
        title: "Viral video added",
        description: "The video URL has been added to your trending collection.",
      });

      setFormData({
        platform: "",
        video_url: "",
        title: "",
        category: "",
        view_count: "",
        thumbnail_url: "",
        brand_notes: "",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding trending URL:', error);
      toast({
        title: "Error",
        description: "Failed to add viral video URL.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Viral Video URL</DialogTitle>
          <DialogDescription>
            Add a trending video from TikTok, YouTube, Instagram, or other platforms
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform *</Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => setFormData({ ...formData, platform: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="x">X (Twitter)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL *</Label>
            <Input
              id="video_url"
              type="url"
              placeholder="https://..."
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Video title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Real Estate, Legal, Finance"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="view_count">View Count</Label>
              <Input
                id="view_count"
                type="number"
                placeholder="0"
                value={formData.view_count}
                onChange={(e) => setFormData({ ...formData, view_count: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                type="url"
                placeholder="https://..."
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_notes">Brand Notes (Optional)</Label>
            <Textarea
              id="brand_notes"
              placeholder="Notes about how to adapt this for your brand..."
              value={formData.brand_notes}
              onChange={(e) => setFormData({ ...formData, brand_notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Video
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}