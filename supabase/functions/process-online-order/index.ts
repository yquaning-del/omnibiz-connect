import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isRateLimited, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessOrderRequest {
  orderId: string;
  action: "confirm" | "ship" | "deliver" | "cancel";
  trackingNumber?: string;
  cancellationReason?: string;
}

// Helper to send SMS notification
async function sendSMSNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  to: string,
  message: string,
  type: string
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message, type }),
    });
    
    if (!response.ok) {
      // SMS notification failed
    }
  } catch (error) {
    
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit: 20 requests per minute per IP
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP, 20)) {
      return rateLimitResponse(corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const { orderId, action, trackingNumber, cancellationReason } = await req.json() as ProcessOrderRequest;

    console.log(`Processing order ${orderId} - Action: ${action}`);

    // Fetch the order with customer info for SMS
    const { data: order, error: orderError } = await supabase
      .from("online_orders")
      .select(`
        *, 
        online_order_items(*),
        shipping_addresses(phone, full_name),
        customers(phone, full_name)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Verify user has access to this organization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("organization_id", order.organization_id)
      .single();

    if (!userRole || !["super_admin", "org_admin", "location_manager"].includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get customer phone for SMS
    const customerPhone = order.shipping_addresses?.phone || order.customers?.phone;
    const customerName = order.shipping_addresses?.full_name || order.customers?.full_name || 'Customer';

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    let smsMessage = '';
    let smsType = '';

    switch (action) {
      case "confirm":
        updateData.status = "confirmed";
        updateData.payment_status = "paid";
        
        // Deduct inventory
        for (const item of order.online_order_items) {
          if (item.product_id) {
            const { error: stockError } = await supabase.rpc("decrement_stock", {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });
            
            if (stockError) {
              console.error(`Failed to decrement stock for product ${item.product_id}:`, stockError);
            }
          }
        }

        smsMessage = `Hi ${customerName}! Your order #${order.order_number} has been confirmed. Total: ${order.currency || 'KES'} ${order.total_amount}. Thank you for your purchase!`;
        smsType = 'order_confirmation';
        break;

      case "ship":
        updateData.status = "shipped";
        updateData.fulfillment_status = "shipped";
        if (trackingNumber) {
          updateData.tracking_number = trackingNumber;
        }

        smsMessage = `Hi ${customerName}! Your order #${order.order_number} has been shipped.${trackingNumber ? ` Tracking: ${trackingNumber}` : ''} Thank you!`;
        smsType = 'order_shipped';
        break;

      case "deliver":
        updateData.status = "delivered";
        updateData.fulfillment_status = "fulfilled";
        updateData.delivered_at = new Date().toISOString();

        smsMessage = `Hi ${customerName}! Great news - your order #${order.order_number} has been delivered. Enjoy your purchase!`;
        smsType = 'order_delivered';
        break;

      case "cancel":
        updateData.status = "cancelled";
        updateData.cancelled_at = new Date().toISOString();
        if (cancellationReason) {
          updateData.cancellation_reason = cancellationReason;
        }
        
        // Restore inventory if order was confirmed
        if (order.status === "confirmed") {
          for (const item of order.online_order_items) {
            if (item.product_id) {
              await supabase
                .from("products")
                .update({
                  stock_quantity: supabase.rpc("increment", { x: item.quantity }),
                })
                .eq("id", item.product_id);
            }
          }
        }

        smsMessage = `Hi ${customerName}, your order #${order.order_number} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ''} Contact us for questions.`;
        smsType = 'general';
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Update the order
    const { error: updateError } = await supabase
      .from("online_orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    // Send SMS notification if customer has phone
    if (customerPhone && smsMessage) {
      await sendSMSNotification(supabaseUrl, supabaseServiceKey, customerPhone, smsMessage, smsType);
    }

    console.log(`Order ${orderId} updated successfully - New status: ${updateData.status}`);

    return new Response(
      JSON.stringify({ success: true, status: updateData.status }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error processing order:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});