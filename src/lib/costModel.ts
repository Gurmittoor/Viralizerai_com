/**
 * Cost Model & Profitability Configuration
 * Ensures 90%+ profit margin on all operations
 * 1 credit = $0.01 (1 cent)
 */

// Price per credit sold to customer
export const CREDIT_PRICE = 0.01; // $0.01 per credit (1 penny = 1 credit)

// Operational costs (our actual expenses)
export const OPERATION_COSTS = {
  // Video generation costs (8-scene video)
  video_generation: {
    gpt5_script: 0.002,      // GPT-5 for script generation
    veo_render: 0.04,        // Veo 3.1 render (8s scene × 8 scenes)
    llm_compliance: 0.002,   // Compliance checking + captions
    storage: 0.01,           // Supabase storage per video
    autoposter: 0.005,       // AutoPoster API push per platform
    misc: 0.01,              // Bandwidth, worker CPU, etc.
    get total() {
      return this.gpt5_script + 
             this.veo_render + 
             this.llm_compliance + 
             this.storage + 
             this.autoposter + 
             this.misc;
    }
  },
  
  // Market Brain crawl costs
  market_brain_crawl: {
    llm_extraction: 0.02,  // GPT-5 for intelligence extraction
    scraping: 0.005,       // Web scraping infrastructure
    storage: 0.005,        // Database storage for insights
    get total() {
      return this.llm_extraction + this.scraping + this.storage;
    }
  },
  
  // Caption/CTA re-render
  caption_rerender: {
    llm_generation: 0.01,
    processing: 0.01,
    get total() {
      return this.llm_generation + this.processing;
    }
  },
  
  // AutoPoster per platform
  autoposter_platform: {
    api_cost: 0.005,
    get total() {
      return this.api_cost;
    }
  }
} as const;

// Credit costs per feature (what we charge the customer)
export const CREDIT_COSTS = {
  video_generation: 120,    // 120 credits per 8-scene video
  market_brain_crawl: 50,   // 50 credits per URL crawl
  caption_rerender: 25,     // 25 credits to re-render captions/CTA
  autoposter_platform: 10,  // 10 credits per platform upload
} as const;

// Calculate profitability for each operation
export const PROFITABILITY = {
  video_generation: {
    credits: CREDIT_COSTS.video_generation,
    revenue: CREDIT_COSTS.video_generation * CREDIT_PRICE,
    cost: OPERATION_COSTS.video_generation.total,
    get profit() {
      return this.revenue - this.cost;
    },
    get margin() {
      return (this.profit / this.revenue) * 100;
    }
  },
  
  market_brain_crawl: {
    credits: CREDIT_COSTS.market_brain_crawl,
    revenue: CREDIT_COSTS.market_brain_crawl * CREDIT_PRICE,
    cost: OPERATION_COSTS.market_brain_crawl.total,
    get profit() {
      return this.revenue - this.cost;
    },
    get margin() {
      return (this.profit / this.revenue) * 100;
    }
  },
  
  caption_rerender: {
    credits: CREDIT_COSTS.caption_rerender,
    revenue: CREDIT_COSTS.caption_rerender * CREDIT_PRICE,
    cost: OPERATION_COSTS.caption_rerender.total,
    get profit() {
      return this.revenue - this.cost;
    },
    get margin() {
      return (this.profit / this.revenue) * 100;
    }
  },
  
  autoposter_platform: {
    credits: CREDIT_COSTS.autoposter_platform,
    revenue: CREDIT_COSTS.autoposter_platform * CREDIT_PRICE,
    cost: OPERATION_COSTS.autoposter_platform.total,
    get profit() {
      return this.revenue - this.cost;
    },
    get margin() {
      return (this.profit / this.revenue) * 100;
    }
  }
} as const;

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  }).format(amount);
}

// Helper function to format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Validate that all operations meet 80% margin requirement
export function validateMargins(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const MIN_MARGIN = 80;

  Object.entries(PROFITABILITY).forEach(([operation, metrics]) => {
    if (metrics.margin < MIN_MARGIN) {
      issues.push(
        `${operation}: ${formatPercentage(metrics.margin)} margin (below ${MIN_MARGIN}% target)`
      );
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

// Monthly subscription tiers
export const SUBSCRIPTION_TIERS = [
  {
    name: 'Starter',
    price: 9,
    credits: 900,
    retail_value: 9,
    approx_videos: 7,
    features: ['7 viral videos/month', 'Market Brain access', 'Basic support']
  },
  {
    name: 'Growth',
    price: 29,
    credits: 3000,
    retail_value: 30,
    approx_videos: 25,
    features: ['25 viral videos/month', 'Market Brain unlimited', 'Priority support', 'AutoPoster included']
  },
  {
    name: 'Pro',
    price: 79,
    credits: 9000,
    retail_value: 90,
    approx_videos: 75,
    features: ['75 viral videos/month', 'Multi-vertical targeting', 'White-label options', 'Dedicated account manager']
  },
  {
    name: 'Elite',
    price: 199,
    credits: 25000,
    retail_value: 250,
    approx_videos: 210,
    features: ['210 viral videos/month', 'Unlimited everything', 'Custom integrations', 'API access', '24/7 priority support']
  }
] as const;

// Top-up credit packages (same 1¢ rate)
export const CREDIT_PACKAGES = [
  { name: 'Mini', credits: 500, price: 5, per_credit: 0.01, purpose: 'Light users' },
  { name: 'Power', credits: 2000, price: 20, per_credit: 0.01, purpose: 'Regular creators' },
  { name: 'Agency', credits: 5000, price: 50, per_credit: 0.01, purpose: 'Bulk posting' },
] as const;
