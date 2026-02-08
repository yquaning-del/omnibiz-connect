// Shared response helpers for edge functions
import { AuthError } from "./auth.ts";
import { ValidationError } from "./validation.ts";

/**
 * Creates a JSON success response with CORS headers.
 */
export function jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Creates an error response with appropriate status code based on error type.
 */
export function errorResponse(
  error: unknown,
  corsHeaders: Record<string, string>
): Response {
  if (error instanceof AuthError) {
    return jsonResponse(
      { success: false, error: error.message },
      corsHeaders,
      error.status
    );
  }
  if (error instanceof ValidationError) {
    return jsonResponse(
      { success: false, error: error.message },
      corsHeaders,
      400
    );
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";
  console.error("Unhandled error:", error);
  return jsonResponse({ success: false, error: message }, corsHeaders, 500);
}
