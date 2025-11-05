import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { credits, paymentMethodId } = await req.json();

    // Get user's org_id
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate price (1¢ per credit = $0.01)
    const amount = Math.round(credits * 1); // cents (1 credit = 1 cent)
    const priceId = Deno.env.get("STRIPE_CREDITS_PRICE_ID");

    if (!priceId) {
      // If no price configured, just add credits for demo
      const { error: addError } = await supabase.rpc("add_credits", {
        _org_id: userData.org_id,
        _amount: credits,
        _description: `Purchased ${credits} credits`,
      });

      if (addError) throw addError;

      return new Response(
        JSON.stringify({ success: true, credits_added: credits }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get or create Stripe customer
    const { data: wallet } = await supabase
      .from("credits_wallet")
      .select("stripe_customer_id")
      .eq("org_id", userData.org_id)
      .single();

    // For now, just add credits directly
    // In production, integrate with Stripe Payment Intents API
    const { error: addError } = await supabase.rpc("add_credits", {
      _org_id: userData.org_id,
      _amount: credits,
      _description: `Purchased ${credits} credits`,
    });

    if (addError) throw addError;

    return new Response(
      JSON.stringify({ success: true, credits_added: credits }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error purchasing credits:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to purchase credits";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
