import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  email: string;
  amount: number;
  currency: string;
  planId: string;
  organizationId: string;
  billingCycle: "monthly" | "yearly";
  paymentMethod: "card" | "mobile_money";
  mobileNetwork?: string;
  mobilePhone?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // PLACEHOLDER: Paystack secret key would be used here
    // const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    const body: PaymentRequest = await req.json();
    const {
      email,
      amount,
      currency,
      planId,
      organizationId,
      billingCycle,
      paymentMethod,
      mobileNetwork,
      mobilePhone,
    } = body;

    // Validate required fields
    if (!email || !amount || !currency || !planId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a mock reference for placeholder
    const reference = `PSK_${Date.now()}_${crypto.randomUUID().split("-")[0]}`;

    // Create a pending transaction record
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        organization_id: organizationId,
        provider: "paystack",
        provider_reference: reference,
        amount,
        currency,
        status: "pending",
        payment_method: paymentMethod,
        mobile_network: mobileNetwork || null,
        metadata: {
          email,
          plan_id: planId,
          billing_cycle: billingCycle,
          mobile_phone: mobilePhone,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Error creating transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PLACEHOLDER: In production, this would call Paystack API
    // const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${paystackSecretKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     email,
    //     amount: amount * 100, // Paystack uses smallest currency unit
    //     currency,
    //     reference,
    //     channels: paymentMethod === "mobile_money" ? ["mobile_money"] : ["card"],
    //     metadata: {
    //       plan_id: planId,
    //       organization_id: organizationId,
    //       billing_cycle: billingCycle,
    //     },
    //   }),
    // });

    // For placeholder, return mock authorization URL
    const mockAuthorizationUrl = `https://checkout.paystack.com/mock/${reference}`;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reference,
          authorization_url: mockAuthorizationUrl,
          transaction_id: transaction.id,
        },
        message: "PLACEHOLDER: Paystack integration pending. Payment simulated.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
