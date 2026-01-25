import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { leaseId, tenantId, email, tenantName, propertyAddress, monthlyRent, organizationId, organizationName } = await req.json();

    if (!leaseId || !tenantId || !email || !organizationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const { error: inviteError } = await supabase
      .from("lease_invitations")
      .insert({
        lease_id: leaseId,
        tenant_id: tenantId,
        organization_id: organizationId,
        email,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    // Update tenant email if provided
    await supabase
      .from("tenants")
      .update({ email })
      .eq("id", tenantId);

    // Build invitation URL
    const appUrl = Deno.env.get("APP_URL") || "https://lovable.dev";
    const inviteUrl = `${appUrl}/tenant/accept-invite/${token}`;

    console.log(`Invitation created for ${email}. URL: ${inviteUrl}`);

    // Note: In production, integrate with Resend to send email
    // For now, return the URL for manual sharing

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation created successfully",
        inviteUrl,
        // In production, email would be sent automatically
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-lease-invitation:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
