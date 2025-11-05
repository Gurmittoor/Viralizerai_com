import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type, id: event.id });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMsg });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${errorMsg}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { sessionId: session.id });

        const orgId = session.metadata?.org_id;
        const credits = Number(session.metadata?.credits || 0);
        const planName = session.metadata?.plan_name || "Credit purchase";

        if (!orgId || !credits) {
          logStep("ERROR: Missing metadata in checkout session", { orgId, credits });
          return new Response(JSON.stringify({ error: "Missing metadata" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("Adding credits", { orgId, credits, planName });

        const { error: addError } = await supabase.rpc("add_credits", {
          _org_id: orgId,
          _amount: credits,
          _description: `Stripe purchase: ${planName}`,
        });

        if (addError) {
          logStep("ERROR: Failed to add credits", { error: addError });
          throw addError;
        }

        logStep("Credits added successfully", { orgId, credits });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_succeeded", { invoiceId: invoice.id });

        // Handle recurring subscription payments
        if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if (!("email" in customer) || !customer.email) {
            logStep("ERROR: Customer has no email");
            break;
          }

          // Find user by email
          const { data: userData } = await supabase
            .from("users")
            .select("org_id")
            .eq("email", customer.email)
            .single();

          if (!userData?.org_id) {
            logStep("ERROR: User not found", { email: customer.email });
            break;
          }

          // Get credits from subscription metadata
          const credits = Number(subscription.metadata?.credits || 0);
          const planName = subscription.metadata?.plan_name || "Monthly subscription";

          if (!credits) {
            logStep("ERROR: No credits in subscription metadata");
            break;
          }

          logStep("Processing subscription renewal", { 
            orgId: userData.org_id, 
            credits, 
            planName 
          });

          // Add monthly credits
          const { error: addError } = await supabase.rpc("add_credits", {
            _org_id: userData.org_id,
            _amount: credits,
            _description: `Monthly renewal: ${planName}`,
          });

          if (addError) {
            logStep("ERROR: Failed to add renewal credits", { error: addError });
            throw addError;
          }

          // Reset monthly usage
          const { error: resetError } = await supabase
            .from("credits_wallet")
            .update({
              credits_used: 0,
              next_reset: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("org_id", userData.org_id);

          if (resetError) {
            logStep("ERROR: Failed to reset usage", { error: resetError });
          }

          logStep("Subscription renewed successfully", { orgId: userData.org_id, credits });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });

        // Handle subscription changes (upgrades/downgrades)
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if (!("email" in customer) || !customer.email) {
          logStep("ERROR: Customer has no email");
          break;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("org_id")
          .eq("email", customer.email)
          .single();

        if (!userData?.org_id) {
          logStep("ERROR: User not found", { email: customer.email });
          break;
        }

        // Update organization's plan tier based on subscription
        const planTier = subscription.metadata?.plan_tier || "starter";
        
        const { error: updateError } = await supabase
          .from("organizations")
          .update({ plan_tier: planTier })
          .eq("id", userData.org_id);

        if (updateError) {
          logStep("ERROR: Failed to update plan tier", { error: updateError });
        } else {
          logStep("Plan tier updated", { orgId: userData.org_id, planTier });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if (!("email" in customer) || !customer.email) {
          logStep("ERROR: Customer has no email");
          break;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("org_id")
          .eq("email", customer.email)
          .single();

        if (!userData?.org_id) {
          logStep("ERROR: User not found", { email: customer.email });
          break;
        }

        // Downgrade to starter plan
        const { error: updateError } = await supabase
          .from("organizations")
          .update({ plan_tier: "starter" })
          .eq("id", userData.org_id);

        if (updateError) {
          logStep("ERROR: Failed to downgrade plan", { error: updateError });
        } else {
          logStep("Subscription cancelled, downgraded to starter", { orgId: userData.org_id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook handler", { error: errorMsg });
    console.error("Webhook error:", error);
    
    return new Response(
      JSON.stringify({ error: errorMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
