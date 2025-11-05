import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  PROFITABILITY, 
  CREDIT_COSTS, 
  CREDIT_PRICE,
  SUBSCRIPTION_TIERS,
  CREDIT_PACKAGES,
  formatCurrency, 
  formatPercentage,
  validateMargins 
} from "@/lib/costModel";
import { TrendingUp, DollarSign, AlertCircle, CheckCircle, Package, Zap } from "lucide-react";
import { CreditCostBadge } from "./CreditCostBadge";

export function ProfitabilityDashboard() {
  const validation = validateMargins();

  const getMarginColor = (margin: number) => {
    if (margin >= 80) return "text-green-600";
    if (margin >= 70) return "text-yellow-600";
    return "text-destructive";
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 80) return <Badge variant="default" className="bg-green-600">Excellent</Badge>;
    if (margin >= 70) return <Badge variant="secondary">Good</Badge>;
    return <Badge variant="destructive">Below Target</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Validation Alert */}
      {!validation.valid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Margin Warning:</strong> Some operations below 80% target
            <ul className="mt-2 ml-4 list-disc text-sm">
              {validation.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.valid && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            <strong>All operations meet 80%+ profitability target</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Pricing Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            Pricing Model
          </CardTitle>
          <CardDescription>Revenue structure and credit pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Price Per Credit</div>
              <div className="text-2xl font-bold text-accent">{formatCurrency(CREDIT_PRICE)}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Target Margin</div>
              <div className="text-2xl font-bold text-green-600">80%+</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Generation Profitability */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Video Generation
            </span>
            <CreditCostBadge cost={CREDIT_COSTS.video_generation} feature="Video Generation" />
          </CardTitle>
          <CardDescription>Per-video profitability breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(PROFITABILITY.video_generation.revenue)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="text-lg font-bold text-destructive">
                {formatCurrency(PROFITABILITY.video_generation.cost)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className="text-lg font-bold text-accent">
                {formatCurrency(PROFITABILITY.video_generation.profit)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Margin</div>
              <div className={`text-lg font-bold ${getMarginColor(PROFITABILITY.video_generation.margin)}`}>
                {formatPercentage(PROFITABILITY.video_generation.margin)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Cost Breakdown</span>
              {getMarginBadge(PROFITABILITY.video_generation.margin)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Veo 3.1 API (3 clips × $0.05)</span>
                <span className="font-mono">{formatCurrency(0.15)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">LLM Script Generation</span>
                <span className="font-mono">{formatCurrency(0.01)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compliance Check</span>
                <span className="font-mono">{formatCurrency(0.005)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage & Processing</span>
                <span className="font-mono">{formatCurrency(0.006)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Brain Profitability */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Market Brain Crawl
            </span>
            <CreditCostBadge cost={CREDIT_COSTS.market_brain_crawl} feature="Market Brain" />
          </CardTitle>
          <CardDescription>Per-crawl profitability breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(PROFITABILITY.market_brain_crawl.revenue)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="text-lg font-bold text-destructive">
                {formatCurrency(PROFITABILITY.market_brain_crawl.cost)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className="text-lg font-bold text-accent">
                {formatCurrency(PROFITABILITY.market_brain_crawl.profit)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Margin</div>
              <div className={`text-lg font-bold ${getMarginColor(PROFITABILITY.market_brain_crawl.margin)}`}>
                {formatPercentage(PROFITABILITY.market_brain_crawl.margin)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Cost Breakdown</span>
              {getMarginBadge(PROFITABILITY.market_brain_crawl.margin)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">LLM Intelligence Extraction</span>
                <span className="font-mono">{formatCurrency(0.025)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Web Scraping Infrastructure</span>
                <span className="font-mono">{formatCurrency(0.01)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database Storage</span>
                <span className="font-mono">{formatCurrency(0.001)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Caption Re-render Profitability */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Caption/CTA Re-render
            </span>
            <CreditCostBadge cost={CREDIT_COSTS.caption_rerender} feature="Caption Re-render" />
          </CardTitle>
          <CardDescription>Per-operation profitability breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(PROFITABILITY.caption_rerender.revenue)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="text-lg font-bold text-destructive">
                {formatCurrency(PROFITABILITY.caption_rerender.cost)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className="text-lg font-bold text-accent">
                {formatCurrency(PROFITABILITY.caption_rerender.profit)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Margin</div>
              <div className={`text-lg font-bold ${getMarginColor(PROFITABILITY.caption_rerender.margin)}`}>
                {formatPercentage(PROFITABILITY.caption_rerender.margin)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Tiers */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" />
            Monthly Subscription Tiers
          </CardTitle>
          <CardDescription>Recurring revenue packages with high retention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const monthlyCost = tier.approx_videos * PROFITABILITY.video_generation.cost;
              const monthlyProfit = tier.price - monthlyCost;
              const margin = (monthlyProfit / tier.price) * 100;
              
              return (
                <div key={tier.name} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-2xl font-bold text-accent">${tier.price}<span className="text-sm text-muted-foreground">/mo</span></p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{tier.credits.toLocaleString()} credits</div>
                      <Badge variant="secondary">{tier.approx_videos} videos</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {tier.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Cost</span>
                      <span className="font-mono text-destructive">{formatCurrency(monthlyCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Profit</span>
                      <span className="font-mono text-green-600">{formatCurrency(monthlyProfit)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Margin</span>
                      <span className={getMarginColor(margin)}>{formatPercentage(margin)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top-Up Packages */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Credit Top-Up Packages
          </CardTitle>
          <CardDescription>One-time credit purchases at 1¢ per credit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {CREDIT_PACKAGES.map((pkg) => {
              const videosIncluded = Math.floor(pkg.credits / CREDIT_COSTS.video_generation);
              
              return (
                <div key={pkg.name} className="p-4 border rounded-lg text-center space-y-2">
                  <div className="text-sm text-muted-foreground">{pkg.name}</div>
                  <div className="text-3xl font-bold">{pkg.credits.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">credits</div>
                  <div className="text-2xl font-bold text-accent">${pkg.price}</div>
                  <div className="text-xs text-muted-foreground">
                    ≈ {videosIncluded} videos
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    {pkg.purpose}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scale Economics */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Scale Economics</CardTitle>
          <CardDescription>Profitability at various volume levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[10, 50, 100, 500, 1000].map((videos) => {
              const revenue = videos * PROFITABILITY.video_generation.revenue;
              const cost = videos * PROFITABILITY.video_generation.cost;
              const profit = revenue - cost;
              
              return (
                <div key={videos} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{videos} Videos/Day</div>
                    <div className="text-xs text-muted-foreground">
                      {videos * 30} per month
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-bold text-green-600">
                      {formatCurrency(profit)}/day profit
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(profit * 30)}/month
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
