// Shared CORS headers for edge functions
// Restrict origin to your app domain in production

const ALLOWED_ORIGINS = [
  Deno.env.get("APP_URL") || "",
  Deno.env.get("SUPABASE_URL") || "",
  "http://localhost:8080",
  "http://localhost:5173",
].filter(Boolean);

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") || "";
  const allowedOrigin =
    ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
