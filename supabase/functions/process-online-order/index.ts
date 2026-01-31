import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from("online_orders")
      .select("*, online_order_items(*)")
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

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

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
        break;

      case "ship":
        updateData.status = "shipped";
        updateData.fulfillment_status = "shipped";
        if (trackingNumber) {
          updateData.tracking_number = trackingNumber;
        }
        break;

      case "deliver":
        updateData.status = "delivered";
        updateData.fulfillment_status = "fulfilled";
        updateData.delivered_at = new Date().toISOString();
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
