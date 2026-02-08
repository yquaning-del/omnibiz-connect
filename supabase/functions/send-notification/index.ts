import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { validateRequired, validateEmail, validateEnum, sanitizeString } from "../_shared/validation.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

interface NotificationRequest {
  type: 'rent_reminder' | 'lease_expiry' | 'maintenance_update' | 'payment_confirmation';
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  data: Record<string, any>;
}

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // Verify JWT authentication
    const { supabaseClient: supabaseClient } = await verifyAuth(req);

    const body = await req.json();
    validateRequired(body, ["type", "recipientEmail", "recipientName", "organizationName"]);

    const type = validateEnum(
      body.type,
      ["rent_reminder", "lease_expiry", "maintenance_update", "payment_confirmation"],
      "type"
    );
    const recipientEmail = validateEmail(body.recipientEmail, "recipientEmail");
    const recipientName = sanitizeString(body.recipientName, "recipientName", 200);
    const organizationName = sanitizeString(body.organizationName, "organizationName", 200);
    const data = body.data || {};

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured - logging notification instead');
      
      const logMessage = generateEmailContent(type, recipientName, organizationName, data);
      console.log('Would send email to:', recipientEmail);
      console.log('Subject:', logMessage.subject);

      return jsonResponse({ 
        success: true, 
        demo: true,
        message: 'Notification logged (Resend not configured)',
        preview: logMessage
      }, cors);
    }

    // Generate email content based on notification type
    const emailContent = generateEmailContent(type, recipientName, organizationName, data);

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${organizationName} <notifications@${Deno.env.get('RESEND_DOMAIN') || 'resend.dev'}>`,
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();

    // Log notification in database (best effort)
    try {
      await supabaseClient
        .from('user_notifications')
        .insert({
          user_id: data.userId,
          type: type,
          title: emailContent.subject,
          message: emailContent.body,
          link: data.link || null,
        });
    } catch (dbError) {
      console.error("Failed to log notification to database:", dbError);
    }

    return jsonResponse({ success: true, emailId: result.id }, cors);

  } catch (error) {
    console.error('Notification error:', error);
    return errorResponse(error, cors);
  }
});

function generateEmailContent(
  type: string,
  recipientName: string,
  organizationName: string,
  data: Record<string, any>
): { subject: string; body: string; html: string } {
  const templates: Record<string, { subject: string; body: string }> = {
    rent_reminder: {
      subject: `Rent Payment Reminder - ${data.unitNumber || 'Your Unit'}`,
      body: `Hi ${recipientName},\n\nThis is a friendly reminder that your rent payment of ${data.amount} is due on ${data.dueDate}.\n\nPlease ensure timely payment to avoid any late fees.\n\nThank you,\n${organizationName}`,
    },
    lease_expiry: {
      subject: `Lease Expiring Soon - ${data.unitNumber || 'Your Unit'}`,
      body: `Hi ${recipientName},\n\nYour lease for ${data.unitNumber} is set to expire on ${data.expiryDate}.\n\nPlease contact us to discuss renewal options.\n\nThank you,\n${organizationName}`,
    },
    maintenance_update: {
      subject: `Maintenance Request Update - #${data.requestId}`,
      body: `Hi ${recipientName},\n\nYour maintenance request "${data.title}" has been updated.\n\nStatus: ${data.status}\n${data.notes ? `Notes: ${data.notes}` : ''}\n\nThank you,\n${organizationName}`,
    },
    payment_confirmation: {
      subject: `Payment Received - ${data.amount}`,
      body: `Hi ${recipientName},\n\nWe have received your payment of ${data.amount}.\n\nTransaction ID: ${data.transactionId}\nDate: ${data.date}\n\nThank you for your prompt payment.\n\n${organizationName}`,
    },
  };

  const template = templates[type] || {
    subject: `Notification from ${organizationName}`,
    body: `Hi ${recipientName},\n\nYou have a new notification.\n\nThank you,\n${organizationName}`,
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${organizationName}</h1>
        </div>
        <div class="content">
          ${template.body.split('\n').map(line => `<p>${line}</p>`).join('')}
          ${data.link ? `<a href="${data.link}" class="button">View Details</a>` : ''}
        </div>
        <div class="footer">
          <p>This email was sent by ${organizationName}</p>
          <p>If you have questions, please contact us directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: template.subject,
    body: template.body,
    html,
  };
}
