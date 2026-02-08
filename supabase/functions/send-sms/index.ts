import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { validateRequired, sanitizeString, validateEnum } from "../_shared/validation.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // Verify JWT authentication
    await verifyAuth(req);

    const body = await req.json();
    validateRequired(body, ["to", "message"]);

    const to = sanitizeString(body.to, "to", 20);
    const message = sanitizeString(body.message, "message", 1600);
    const type = body.type
      ? validateEnum(body.type, ["order_confirmation", "order_shipped", "order_delivered", "general"], "type")
      : "general";

    // Normalize phone number (ensure it starts with +)
    const phoneNumber = to.startsWith('+') ? to : `+${to}`;

    // Basic phone number validation
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return jsonResponse({ success: false, error: "Invalid phone number format" }, cors, 400);
    }

    // Check if Africa's Talking credentials are configured
    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const username = Deno.env.get('AFRICASTALKING_USERNAME');

    if (!apiKey || !username) {
      console.log('SMS credentials not configured - logging message instead');
      console.log(`Would send SMS to: ${phoneNumber}`);
      console.log(`Message type: ${type}`);

      return jsonResponse({
        success: true,
        demo: true,
        message: 'SMS logged (credentials not configured)',
        preview: { to: phoneNumber, message, type }
      }, cors);
    }

    // Send via Africa's Talking API
    const baseUrl = username === 'sandbox' 
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('to', phoneNumber);
    formData.append('message', message);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`SMS API error: ${JSON.stringify(result)}`);
    }

    console.log('SMS sent successfully:', result);

    return jsonResponse({ success: true, result }, cors);

  } catch (error) {
    console.error('SMS error:', error);
    return errorResponse(error, cors);
  }
});
