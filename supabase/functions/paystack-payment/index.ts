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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PLACEHOLDER: Paystack secret key - add PAYSTACK_SECRET_KEY to secrets when ready
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const isLiveMode = !!paystackSecretKey;

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

    if (!email || !amount || !currency || !planId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reference = `PSK_${Date.now()}_${crypto.randomUUID().split("-")[0]}`;

    // Create pending transaction
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
          is_placeholder: !isLiveMode,
        },
      })
      .select()
      .single();

    if (txError) {
      // Error creating transaction
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let authorizationUrl: string;
    let message: string;

    if (isLiveMode) {
      // LIVE MODE: Call actual Paystack API
      console.log("Initializing Paystack payment (live mode)");
      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Paystack uses smallest currency unit
          currency,
          reference,
          channels: paymentMethod === "mobile_money" ? ["mobile_money"] : ["card"],
          metadata: {
            plan_id: planId,
            organization_id: organizationId,
            billing_cycle: billingCycle,
          },
        }),
      });

      const paystackData = await paystackResponse.json();
      
      if (!paystackData.status) {
        console.error("Paystack error:", paystackData);
        return new Response(
          JSON.stringify({ error: paystackData.message || "Payment initialization failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authorizationUrl = paystackData.data.authorization_url;
      message = "Payment initialized successfully";
    } else {
      // PLACEHOLDER MODE: Return mock URL
      console.log("Initializing Paystack payment (placeholder mode)");
      authorizationUrl = `https://checkout.paystack.com/mock/${reference}`;
      message = "PLACEHOLDER MODE: Add PAYSTACK_SECRET_KEY to enable live payments";
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reference,
          authorization_url: authorizationUrl,
          transaction_id: transaction.id,
        },
        message,
        isPlaceholder: !isLiveMode,
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
