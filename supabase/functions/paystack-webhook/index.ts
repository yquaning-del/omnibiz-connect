import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // PLACEHOLDER: Webhook secret would be used for verification
    // const webhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
    // const signature = req.headers.get("x-paystack-signature");

    const body = await req.json();
    const { event, data } = body;

    console.log("Received webhook event:", event);

    // PLACEHOLDER: In production, verify the webhook signature
    // const hash = crypto.createHmac("sha512", webhookSecret)
    //   .update(JSON.stringify(body))
    //   .digest("hex");
    // if (hash !== signature) {
    //   return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    // }

    switch (event) {
      case "charge.success": {
        const { reference, amount, currency, customer } = data;

        // Update transaction status
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

        // Get metadata from transaction
        const metadata = transaction.metadata as any;
        const organizationId = transaction.organization_id;
        const planId = metadata?.plan_id;
        const billingCycle = metadata?.billing_cycle || "monthly";

        if (organizationId && planId) {
          // Calculate period dates
          const now = new Date();
          const periodEnd = new Date(now);
          if (billingCycle === "yearly") {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          // Update or create subscription
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
          }
        }

        console.log("Payment successful:", reference);
        break;
      }

      case "charge.failed": {
        const { reference, gateway_response } = data;

        // Update transaction status
        await supabase
          .from("payment_transactions")
          .update({
            status: "failed",
            metadata: supabase.rpc("jsonb_set", {
              target: "metadata",
              path: "{failure_reason}",
              value: gateway_response,
            }),
          })
          .eq("provider_reference", reference);

        console.log("Payment failed:", reference, gateway_response);
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
