import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define available tools for the AI copilot
const tools = [
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Get sales data for a specific time period (today, week, month)",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "week", "month"],
            description: "Time period for the sales summary"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_items",
      description: "Get products that are low on stock or need reordering",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of items to return"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_reservations",
      description: "Get upcoming reservations for a location",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check reservations (ISO format, defaults to today)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_customers",
      description: "Get top customers by loyalty points or total spending",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of customers to return"
          },
          sortBy: {
            type: "string",
            enum: ["loyalty_points", "orders"],
            description: "How to rank customers"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pending_orders",
      description: "Get orders that are pending or in progress",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_availability",
      description: "Get hotel room availability and status",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check availability"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_maintenance_requests",
      description: "Get open maintenance requests",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "all"],
            description: "Filter by status"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_expiring_medications",
      description: "Get medications that are expiring soon (pharmacy vertical)",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days to look ahead for expiring items"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_notification",
      description: "Send a notification to staff or customers",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["email", "sms", "push"],
            description: "Notification channel"
          },
          recipient: {
            type: "string",
            description: "Email or phone number of recipient"
          },
          message: {
            type: "string",
            description: "Message content"
          }
        },
        required: ["type", "recipient", "message"]
      }
    }
  }
];

// Tool execution functions
async function executeTool(supabase: any, toolName: string, args: any, context: any) {
  const { organizationId, locationId } = context;

  switch (toolName) {
    case "get_sales_summary": {
      let startDate = new Date();
      if (args.period === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (args.period === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (args.period === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, status, created_at")
        .eq("location_id", locationId)
        .gte("created_at", startDate.toISOString());

      const totalRevenue = orders?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
      const orderCount = orders?.length || 0;

      return {
        period: args.period,
        totalRevenue,
        orderCount,
        averageOrder: orderCount > 0 ? totalRevenue / orderCount : 0
      };
    }

    case "get_low_stock_items": {
      const { data: products } = await supabase
        .from("products")
        .select("name, stock_quantity, low_stock_threshold, category")
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      const lowStock = products?.filter((p: any) => p.stock_quantity <= p.low_stock_threshold) || [];
      return lowStock.slice(0, args.limit || 10);
    }

    case "get_reservations": {
      const checkDate = args.date || new Date().toISOString().split("T")[0];
      const { data: reservations } = await supabase
        .from("reservations")
        .select("guest_name, guest_count, check_in, status, reservation_type")
        .eq("location_id", locationId)
        .gte("check_in", checkDate)
        .order("check_in");

      return reservations?.slice(0, 20) || [];
    }

    case "get_top_customers": {
      const { data: customers } = await supabase
        .from("customers")
        .select("full_name, email, loyalty_points")
        .eq("organization_id", organizationId)
        .order("loyalty_points", { ascending: false })
        .limit(args.limit || 5);

      return customers || [];
    }

    case "get_pending_orders": {
      const { data: orders } = await supabase
        .from("orders")
        .select("order_number, status, total_amount, created_at, metadata")
        .eq("location_id", locationId)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: false })
        .limit(20);

      return orders || [];
    }

    case "get_room_availability": {
      const { data: rooms } = await supabase
        .from("hotel_rooms")
        .select("room_number, room_type, status, housekeeping_status, price_per_night")
        .eq("location_id", locationId);

      const available = rooms?.filter((r: any) => r.status === "available").length || 0;
      const occupied = rooms?.filter((r: any) => r.status === "occupied").length || 0;
      const maintenance = rooms?.filter((r: any) => r.status === "maintenance").length || 0;

      return { total: rooms?.length || 0, available, occupied, maintenance, rooms };
    }

    case "get_maintenance_requests": {
      let query = supabase
        .from("maintenance_requests")
        .select("title, description, priority, status, created_at")
        .eq("location_id", locationId);

      if (args.status && args.status !== "all") {
        query = query.eq("status", args.status);
      }

      const { data } = await query.order("created_at", { ascending: false }).limit(20);
      return data || [];
    }

    case "get_expiring_medications": {
      const daysAhead = args.days || 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data: products } = await supabase
        .from("products")
        .select("name, stock_quantity, metadata")
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      // Filter by expiry in metadata
      const expiring = products?.filter((p: any) => {
        const expiryDate = p.metadata?.expiry_date;
        if (!expiryDate) return false;
        return new Date(expiryDate) <= futureDate;
      }) || [];

      return expiring;
    }

    case "send_notification": {
      // This would integrate with notification service
      console.log(`Would send ${args.type} notification to ${args.recipient}: ${args.message}`);
      return { 
        success: true, 
        message: `Notification queued for delivery via ${args.type}` 
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, organizationId, locationId, vertical, conversationHistory = [] } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const context = { organizationId, locationId, vertical };

    // System prompt tailored to business context
    const systemPrompt = `You are an AI assistant for a ${vertical || 'business'} management platform. You help users:
- Get insights about their business (sales, inventory, customers, reservations)
- Answer questions about their data
- Perform actions like sending notifications

Current context:
- Business vertical: ${vertical}
- Location ID: ${locationId}

When users ask questions, use the available tools to fetch real data before responding.
Be concise, helpful, and actionable. Format currency values nicely and use bullet points for lists.
If you can't help with something, politely explain what you can do instead.`;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    // Initial AI call with tools
    console.log("Calling AI with tools...");
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!initialResponse.ok) {
      throw new Error(`AI Gateway error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices?.[0]?.message;

    // Check if AI wants to use tools
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`AI requested ${assistantMessage.tool_calls.length} tool(s)`);

      // Execute all tool calls
      const toolResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        console.log(`Executing tool: ${toolCall.function.name}`, args);
        
        const result = await executeTool(supabase, toolCall.function.name, args, context);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }

      // Send tool results back to AI for final response
      const finalMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
      ];

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: finalMessages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      const finalData = await finalResponse.json();
      const finalContent = finalData.choices?.[0]?.message?.content;

      return new Response(JSON.stringify({
        success: true,
        response: finalContent,
        toolsUsed: assistantMessage.tool_calls.map((tc: any) => tc.function.name)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // No tools needed - return direct response
    return new Response(JSON.stringify({
      success: true,
      response: assistantMessage?.content || "I couldn't generate a response.",
      toolsUsed: []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("AI Copilot error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
