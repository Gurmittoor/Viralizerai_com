import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2, Plus, RefreshCw, X, ExternalLink } from "lucide-react";

interface MarketBrainSectionProps {
  orgId: string;
}

export function MarketBrainSection({ orgId }: MarketBrainSectionProps) {
  const { toast } = useToast();
  const [sources, setSources] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<'self' | 'competitor' | 'blog' | 'landing_page'>('self');
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, [orgId]);

  const loadSources = async () => {
    try {
      const { data } = await supabase
        .from('org_sources')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      
      setSources(data || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async () => {
    if (!newUrl.trim() || !newUrl.startsWith('http')) {
      toast({ title: "Invalid URL", description: "Please enter a valid URL", variant: "destructive" });
      return;
    }

    setCrawling(newUrl);
    try {
      const { data, error } = await supabase.functions.invoke('crawl-and-learn', {
        body: { url: newUrl, type: newType, label: newUrl }
      });

      if (error) throw error;

      toast({
        title: "Source analyzed",
        description: `Successfully crawled and analyzed. Cost: ${data.creditsCharged} credits`,
      });

      setNewUrl("");
      loadSources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to crawl source",
        variant: "destructive"
      });
    } finally {
      setCrawling(null);
    }
  };

  const handleRecrawl = async (sourceId: string, url: string) => {
    setCrawling(url);
    try {
      const { data, error } = await supabase.functions.invoke('crawl-and-learn', {
        body: { url, type: 'self' }
      });

      if (error) throw error;

      toast({ title: "Re-crawled successfully", description: `Cost: ${data.creditsCharged} credits` });
      loadSources();
    } catch (error) {
      toast({ title: "Error", description: "Failed to re-crawl", variant: "destructive" });
    } finally {
      setCrawling(null);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" />
          <CardTitle>Market Brain (Beta)</CardTitle>
        </div>
        <CardDescription>
          Add your website, blog, or competitor sites. AI analyzes them to create targeted videos for your market.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="https://example.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSource()}
            />
          </div>
          <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Your Site</SelectItem>
              <SelectItem value="competitor">Competitor</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
              <SelectItem value="landing_page">Landing Page</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddSource} disabled={!!crawling}>
            {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Cost: 5 credits per crawl. AI extracts market intelligence from the site.
        </p>

        {sources.length > 0 && (
          <div className="space-y-2 pt-2">
            <Label className="text-sm">Sources ({sources.length})</Label>
            {sources.map((source) => (
              <div key={source.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.url}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{source.type}</Badge>
                    <Badge variant={source.crawl_status === 'ok' ? 'default' : source.crawl_status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                      {source.crawl_status}
                    </Badge>
                    {source.last_crawled_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(source.last_crawled_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRecrawl(source.id, source.url)}
                  disabled={crawling === source.url}
                >
                  <RefreshCw className={`w-4 h-4 ${crawling === source.url ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
