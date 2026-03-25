import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // Verify JWT authentication
    const { user } = await verifyAuth(req);

    const body = await req.json();
    const { userId } = body;

    // Users can only delete their own account
    if (userId !== user.id) {
      return jsonResponse({ error: "Unauthorized: can only delete your own account" }, cors, 403);
    }

    // Use service role to perform the deletion
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is sole admin of any organization
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .in("role", ["org_admin"]);

    if (adminRoles && adminRoles.length > 0) {
      for (const role of adminRoles) {
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", role.organization_id)
          .in("role", ["org_admin"])
          .neq("user_id", userId);

        if (count === 0) {
          return jsonResponse(
            {
              error: "You are the sole admin of an organization. Please transfer ownership before deleting your account.",
            },
            cors,
            400
          );
        }
      }
    }

    // Delete user data in order (respecting foreign keys)
    // 1. Permissions
    const { data: userRoleIds } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId);

    if (userRoleIds && userRoleIds.length > 0) {
      await supabaseAdmin
        .from("user_permissions")
        .delete()
        .in("user_role_id", userRoleIds.map((r: any) => r.id));
    }

    // 2. Roles, notifications, achievements, feedback
    await Promise.all([
      supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
      supabaseAdmin.from("user_notifications").delete().eq("user_id", userId),
      supabaseAdmin.from("user_achievements").delete().eq("user_id", userId),
      supabaseAdmin.from("feedback_submissions").delete().eq("user_id", userId),
    ]);

    // 3. Profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 4. Auth user (this is last)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }

    return jsonResponse({ success: true, message: "Account deleted successfully" }, cors);
  } catch (error) {
    console.error("Account deletion error:", error);
    return errorResponse(error, cors);
  }
});
