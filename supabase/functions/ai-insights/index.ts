import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyOrgAccess } from "../_shared/auth.ts";
import { validateRequired, validateUUID, validateEnum } from "../_shared/validation.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // Verify JWT authentication
    const { userId, supabaseClient: supabase } = await verifyAuth(req);

    const body = await req.json();
    validateRequired(body, ["type", "organizationId"]);

    const type = validateEnum(body.type, ["sales_forecast", "inventory_forecast", "daily_summary"], "type");
    const organizationId = validateUUID(body.organizationId, "organizationId");

    // Verify user has access to the organization
    const hasAccess = await verifyOrgAccess(supabase, userId, organizationId);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: "Access denied to this organization" }, cors, 403);
    }

    // Process insights request

    let prompt = "";
    let context = "";

    if (type === "sales_forecast") {
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total_amount, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);

      const salesSummary = orders?.reduce((acc: any, o) => {
        const date = new Date(o.created_at).toDateString();
        acc[date] = (acc[date] || 0) + Number(o.total_amount);
        return acc;
      }, {});

      context = JSON.stringify(salesSummary || {});
      prompt = `You are a business analytics AI. Analyze this sales data and provide:
1. A brief trend analysis (2-3 sentences)
2. Sales forecast for the next 7 days
3. Top recommendation to improve sales

Sales by date: ${context}

Respond in JSON format:
{
  "trend": "string describing the trend",
  "forecast": [{"date": "YYYY-MM-DD", "predicted": number}],
  "recommendation": "string with actionable advice",
  "confidence": "high|medium|low"
}`;
    } else if (type === "inventory_forecast") {
      const { data: products } = await supabase
        .from("products")
        .select("name, stock_quantity, low_stock_threshold, category")
        .eq("organization_id", organizationId)
        .order("stock_quantity", { ascending: true })
        .limit(50);

      context = JSON.stringify(products || []);
      prompt = `You are an inventory management AI. Analyze this inventory data and provide:
1. Products that need immediate restocking
2. Predicted stockout dates based on typical consumption
3. Optimization recommendations

Inventory data: ${context}

Respond in JSON format:
{
  "critical": [{"name": "string", "current": number, "action": "string"}],
  "warnings": [{"name": "string", "daysUntilStockout": number}],
  "recommendations": ["string array of 3 recommendations"]
}`;
    } else if (type === "daily_summary") {
      const today = new Date().toISOString().split("T")[0];
      
      const [ordersRes, reservationsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount, status")
          .eq("organization_id", organizationId)
          .gte("created_at", today),
        supabase
          .from("reservations")
          .select("status, reservation_type")
          .eq("organization_id", organizationId)
          .gte("check_in", today),
      ]);

      context = JSON.stringify({
        orders: ordersRes.data || [],
        reservations: reservationsRes.data || [],
      });

      prompt = `You are a hospitality business assistant. Summarize today's activity:
${context}

Provide a brief, friendly summary including:
1. Total orders and revenue
2. Reservations overview
3. One actionable insight

Keep it under 100 words. Be conversational and helpful.`;
    }

    console.log("Calling Lovable AI Gateway...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful business analytics assistant for hospitality businesses. Always respond with accurate, actionable insights.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    console.log("AI response received successfully");

    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      result = { text: content };
    }

    return jsonResponse({ success: true, data: result }, cors);
  } catch (error) {
    console.error("AI Insights error:", error);
    return errorResponse(error, cors);
  }
});
