// Public refill request submission with rate limiting and validation.
// verify_jwt = false (public endpoint). Inserts via service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { isRateLimited, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

interface RefillPayload {
  organization_id: string;
  location_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  medication_name?: string;
  prescription_id?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Per-IP rate limit: 5 submissions / 5 minutes
  const ip = getClientIP(req);
  if (isRateLimited(`refill:${ip}`, 5, 5 * 60_000)) {
    return rateLimitResponse(corsHeaders);
  }

  let payload: RefillPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    organization_id,
    location_id,
    patient_name,
    patient_phone,
    patient_email,
    medication_name,
    prescription_id,
    notes,
  } = payload || ({} as RefillPayload);

  if (
    !organization_id ||
    !location_id ||
    !patient_name ||
    patient_name.trim().length < 2 ||
    !patient_phone ||
    patient_phone.trim().length < 7
  ) {
    return json({ error: "Missing or invalid required fields" }, 400);
  }

  if (patient_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient_email)) {
    return json({ error: "Invalid email" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Confirm location belongs to org (prevents cross-org spam)
  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("id, organization_id")
    .eq("id", location_id)
    .eq("organization_id", organization_id)
    .maybeSingle();

  if (locErr || !loc) {
    return json({ error: "Invalid location" }, 400);
  }

  const { data, error } = await supabase
    .from("refill_requests")
    .insert({
      organization_id,
      location_id,
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      patient_email: patient_email?.trim() || null,
      medication_name: medication_name?.trim() || null,
      prescription_id: prescription_id || null,
      notes: notes?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("refill insert error", error.message);
    return json({ error: "Failed to submit refill request" }, 500);
  }

  return json({ success: true, id: data.id });
});
