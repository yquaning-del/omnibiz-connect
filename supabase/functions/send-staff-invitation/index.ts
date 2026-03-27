import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 10 requests per minute per IP
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP, 10)) {
      return rateLimitResponse(corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const body = await req.json();
    const { action, token } = body;

    // Admin client for bypassing RLS
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle token validation (public action)
    if (action === "validate" && token) {
      
      
      const { data: invitation, error } = await adminSupabase
        .from("staff_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !invitation) {
        return new Response(
          JSON.stringify({ error: "Invalid invitation token" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get organization name
      const { data: org } = await adminSupabase
        .from("organizations")
        .select("name")
        .eq("id", invitation.organization_id)
        .single();

      return new Response(
        JSON.stringify({ 
          invitation,
          organizationName: org?.name || "Organization"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle invitation completion (after user signs up)
    if (action === "complete" && token && body.userId) {
      
      
      const { data: invitation, error: fetchError } = await adminSupabase
        .from("staff_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (fetchError || !invitation) {
        return new Response(
          JSON.stringify({ error: "Invalid invitation token" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user role
      const { error: roleError } = await adminSupabase
        .from("user_roles")
        .insert({
          user_id: body.userId,
          organization_id: invitation.organization_id,
          location_id: invitation.location_id,
          role: invitation.role,
        });

      if (roleError) {
        console.error("Error creating user role:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to assign role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark invitation as accepted
      await adminSupabase
        .from("staff_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle creating new invitation (requires auth)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const tokenStr = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userSupabase.auth.getUser(tokenStr);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role, organization_id, location_id } = body;

    if (!email || !role || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, role, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    console.log("Creating staff invitation");

    // Check if there's already a pending invitation for this email in this org
    const { data: existingInvite } = await adminSupabase
      .from("staff_invitations")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      // Update existing invitation
      await adminSupabase
        .from("staff_invitations")
        .update({
          token: inviteToken,
          role,
          location_id,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        })
        .eq("id", existingInvite.id);
    } else {
      // Create new invitation
      const { error: insertError } = await adminSupabase
        .from("staff_invitations")
        .insert({
          organization_id,
          location_id: location_id || null,
          email: email.toLowerCase(),
          role,
          token: inviteToken,
          invited_by: userData.user.id,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error creating invitation:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build invitation URL
    const origin = req.headers.get("origin") || "https://lovable.app";
    const inviteUrl = `${origin}/staff/accept-invite/${inviteToken}`;

    console.log("Invitation created successfully");

    // Check if RESEND_API_KEY is configured
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendKey) {
      // TODO: Send email via Resend
      console.log("RESEND_API_KEY found, would send email here");
    }

    // Return the invite URL for manual sharing
    return new Response(
      JSON.stringify({ 
        success: true, 
        inviteUrl,
        message: "Invitation created successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-staff-invitation:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
