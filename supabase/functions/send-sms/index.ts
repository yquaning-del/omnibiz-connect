import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  message: string;
  type?: 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'general';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, message, type = 'general' } = await req.json() as SMSRequest;

    if (!to || !message) {
      throw new Error('Missing required fields: to, message');
    }

    // Normalize phone number (ensure it starts with +)
    const phoneNumber = to.startsWith('+') ? to : `+${to}`;

    // Check if Africa's Talking credentials are configured
    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const username = Deno.env.get('AFRICASTALKING_USERNAME');

    if (!apiKey || !username) {
      console.log('SMS credentials not configured - logging message instead');
      console.log(`Would send SMS to: ${phoneNumber}`);
      console.log(`Message type: ${type}`);
      console.log(`Message: ${message}`);

      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          message: 'SMS logged (credentials not configured)',
          preview: { to: phoneNumber, message, type }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('SMS error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
