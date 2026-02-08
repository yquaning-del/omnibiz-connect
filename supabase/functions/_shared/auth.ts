// Shared authentication helpers for edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  userId: string;
  supabaseClient: ReturnType<typeof createClient>;
}

/**
 * Verifies the JWT from the Authorization header and returns the authenticated
 * user ID along with a service-role Supabase client for subsequent queries.
 * Throws an error (with a status-appropriate message) if auth fails.
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new AuthError("Missing Authorization header", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new AuthError("Invalid Authorization header format", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create a client with the user's token to verify identity
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new AuthError("Invalid or expired token", 401);
  }

  // Return a service-role client for privileged operations
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  return { userId: user.id, supabaseClient: serviceClient };
}

/**
 * Verifies that the authenticated user has access to the given organization.
 * Uses the service-role client to check user_roles.
 */
export async function verifyOrgAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (!organizationId) return false;

  // Check if user has a role in the org
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  // Super admins can access any org
  const { data: superAdminRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin");

  return (roles && roles.length > 0) || (superAdminRoles && superAdminRoles.length > 0);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
