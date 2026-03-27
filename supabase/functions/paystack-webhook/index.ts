import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // PLACEHOLDER: Webhook secret - add PAYSTACK_WEBHOOK_SECRET to secrets when ready
    const webhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
    const isLiveMode = !!webhookSecret;

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    

    // Verify webhook signature in live mode
    if (isLiveMode) {
      const signature = req.headers.get("x-paystack-signature");
      if (!signature) {
        
        return new Response(
          JSON.stringify({ error: "Missing signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hash = createHmac("sha512", webhookSecret)
        .update(rawBody)
        .digest("hex");
      
      if (hash !== signature) {
        
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
    } else {
      console.log("PLACEHOLDER MODE: Skipping signature verification");
    }

    switch (event) {
      case "charge.success": {
        const { reference } = data;

        const { data: transaction, error: txError } = await supabase
          .from("payment_transactions")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
          })
          .eq("provider_reference", reference)
          .select()
          .single();

        if (txError) {
          console.error("Error updating transaction:", txError);
          break;
        }

        const metadata = transaction.metadata as Record<string, unknown>;
        const organizationId = transaction.organization_id;
        const planId = metadata?.plan_id as string;
        const billingCycle = (metadata?.billing_cycle as string) || "monthly";

        if (organizationId && planId) {
          const now = new Date();
          const periodEnd = new Date(now);
          if (billingCycle === "yearly") {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          const { error: subError } = await supabase
            .from("organization_subscriptions")
            .upsert({
              organization_id: organizationId,
              plan_id: planId,
              status: "active",
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: now.toISOString(),
            }, {
              onConflict: "organization_id",
            });

          if (subError) {
            console.error("Error updating subscription:", subError);
            console.log("Subscription activated for org");
          }
        }

        console.log("Payment processed successfully");
        break;
      }

      case "charge.failed": {
        const { reference, gateway_response } = data;

        const { error } = await supabase
          .from("payment_transactions")
          .update({
            status: "failed",
            metadata: { failure_reason: gateway_response },
          })
          .eq("provider_reference", reference);

        if (error) {
          console.error("Error updating failed transaction:", error);
        }

        console.log("Payment failed for transaction");
        break;
      }

      default:
        console.log("Unhandled event type:", event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
