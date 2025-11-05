import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Stripe Price IDs - Update these after creating products in Stripe Dashboard
const PRICE_IDS: Record<string, { priceId: string; credits: number; name: string; tier?: string }> = {
  // Subscription Plans
  starter: { 
    priceId: "price_starter_monthly", 
    credits: 900, 
    name: "Starter Plan",
    tier: "starter"
  },
  growth: { 
    priceId: "price_growth_monthly", 
    credits: 3000, 
    name: "Growth Plan",
    tier: "growth"
  },
  pro: { 
    priceId: "price_pro_monthly", 
    credits: 9000, 
    name: "Pro Plan",
    tier: "pro"
  },
  elite: { 
    priceId: "price_elite_monthly", 
    credits: 25000, 
    name: "Elite Plan",
    tier: "elite"
  },
  // Top-Up Packages
  mini: { 
    priceId: "price_topup_mini", 
    credits: 500, 
    name: "Mini Top-Up" 
  },
  standard: { 
    priceId: "price_topup_standard", 
    credits: 2000, 
    name: "Standard Top-Up" 
  },
  power: { 
    priceId: "price_topup_power", 
    credits: 5000, 
    name: "Power Top-Up" 
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Checkout request received");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logStep("ERROR: User not authenticated");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planKey, mode } = await req.json();
    
    if (!planKey || !PRICE_IDS[planKey]) {
      logStep("ERROR: Invalid plan key", { planKey });
      return new Response(JSON.stringify({ error: "Invalid plan key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = PRICE_IDS[planKey];
    logStep("Plan selected", { planKey, plan });

    // Get user's org_id
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      logStep("ERROR: Organization not found");
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Organization found", { orgId: userData.org_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          org_id: userData.org_id,
        },
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });

      // Store Stripe customer ID
      await supabase
        .from("credits_wallet")
        .update({ stripe_customer_id: customerId })
        .eq("org_id", userData.org_id);
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Determine checkout mode - subscription or payment
    const checkoutMode = mode || (plan.tier ? "subscription" : "payment");
    
    logStep("Creating checkout session", { 
      customerId, 
      priceId: plan.priceId,
      mode: checkoutMode 
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: checkoutMode,
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        org_id: userData.org_id,
        credits: plan.credits.toString(),
        plan_name: plan.name,
        ...(plan.tier && { plan_tier: plan.tier }),
      },
      ...(checkoutMode === "subscription" && {
        subscription_data: {
          metadata: {
            org_id: userData.org_id,
            credits: plan.credits.toString(),
            plan_name: plan.name,
            plan_tier: plan.tier,
          },
        },
      }),
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { error: errorMsg });
    console.error("Create checkout error:", error);
    
    return new Response(
      JSON.stringify({ error: errorMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
