import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyOrgAccess } from "../_shared/auth.ts";
import { validateRequired, validateUUID, validateEmail } from "../_shared/validation.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // Verify JWT authentication
    const { userId, supabaseClient: supabase } = await verifyAuth(req);

    const body = await req.json();
    validateRequired(body, ["leaseId", "tenantId", "email", "organizationId"]);

    const leaseId = validateUUID(body.leaseId, "leaseId");
    const tenantId = validateUUID(body.tenantId, "tenantId");
    const email = validateEmail(body.email, "email");
    const organizationId = validateUUID(body.organizationId, "organizationId");
    const tenantName = body.tenantName || "";
    const propertyAddress = body.propertyAddress || "";
    const monthlyRent = body.monthlyRent || "";
    const organizationName = body.organizationName || "";

    // Verify user has access to the organization
    const hasAccess = await verifyOrgAccess(supabase, userId, organizationId);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: "Access denied to this organization" }, cors, 403);
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

    return jsonResponse({
      success: true,
      message: "Invitation created successfully",
      inviteUrl,
    }, cors);
  } catch (error) {
    console.error("Error in send-lease-invitation:", error);
    return errorResponse(error, cors);
  }
});
