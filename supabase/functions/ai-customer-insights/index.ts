import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyOrgAccess } from "../_shared/auth.ts";
import { validateRequired, validateUUID, sanitizeString } from "../_shared/validation.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // Verify JWT authentication
    const { userId, supabaseClient: supabase } = await verifyAuth(req);

    const body = await req.json();
    validateRequired(body, ["organizationId"]);

    const organizationId = validateUUID(body.organizationId, "organizationId");
    const vertical = body.vertical ? sanitizeString(body.vertical, "vertical", 50) : "business";

    // Verify user has access to the organization
    const hasAccess = await verifyOrgAccess(supabase, userId, organizationId);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: "Access denied to this organization" }, cors, 403);
    }

    console.log(`AI Customer Insights: ${vertical} for org ${organizationId}`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch customer and order data
    const [customersRes, ordersRes, recentOrdersRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, email, created_at, total_orders, total_spent, last_order_date")
        .eq("organization_id", organizationId)
        .order("total_spent", { ascending: false })
        .limit(100),
      supabase
        .from("orders")
        .select("customer_id, total_amount, created_at, status")
        .eq("organization_id", organizationId)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("customer_id, total_amount, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const customers = customersRes.data || [];
    const orders = ordersRes.data || [];
    const recentOrders = recentOrdersRes.data || [];

    // Calculate customer metrics
    const customerMetrics = customers.map((c: any) => {
      const customerOrders = orders.filter((o: any) => o.customer_id === c.id);
      const recentCustomerOrders = recentOrders.filter((o: any) => o.customer_id === c.id);
      const lastOrderDate = c.last_order_date ? new Date(c.last_order_date) : null;
      const daysSinceLastOrder = lastOrderDate 
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / 86400000)
        : 999;

      return {
        id: c.id,
        name: c.full_name || "Unknown",
        totalSpent: Number(c.total_spent || 0),
        totalOrders: Number(c.total_orders || 0),
        recentOrders: recentCustomerOrders.length,
        daysSinceLastOrder,
        avgOrderValue: customerOrders.length > 0
          ? customerOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) / customerOrders.length
          : 0,
      };
    });

    // Segment customers
    const avgSpend = customerMetrics.length > 0
      ? customerMetrics.reduce((sum, c) => sum + c.totalSpent, 0) / customerMetrics.length
      : 0;

    const segments = {
      vip: customerMetrics.filter(c => c.totalSpent > avgSpend * 2).length,
      regular: customerMetrics.filter(c => c.totalSpent > avgSpend * 0.5 && c.totalSpent <= avgSpend * 2).length,
      occasional: customerMetrics.filter(c => c.totalSpent > 0 && c.totalSpent <= avgSpend * 0.5).length,
      atRisk: customerMetrics.filter(c => c.daysSinceLastOrder > 30 && c.totalOrders > 1).length,
      dormant: customerMetrics.filter(c => c.daysSinceLastOrder > 60).length,
    };

    const topCustomers = customerMetrics
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(c => ({ name: c.name, totalSpent: c.totalSpent, orders: c.totalOrders }));

    const atRiskCustomers = customerMetrics
      .filter(c => c.daysSinceLastOrder > 30 && c.daysSinceLastOrder < 90 && c.totalOrders > 1)
      .slice(0, 5)
      .map(c => ({ name: c.name, daysSinceLastOrder: c.daysSinceLastOrder, totalSpent: c.totalSpent }));

    const contextData = {
      totalCustomers: customers.length,
      segments,
      avgCustomerSpend: avgSpend.toFixed(2),
      topCustomers,
      atRiskCustomers,
      recentOrderCount: recentOrders.length,
      avgOrderValueLast30Days: recentOrders.length > 0
        ? (recentOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) / recentOrders.length).toFixed(2)
        : 0,
    };

    const prompt = `You are a customer analytics AI for a ${vertical} business. Analyze this customer data and provide actionable insights.

Customer Data:
${JSON.stringify(contextData, null, 2)}

Provide a JSON response with:
{
  "segments": [
    { "name": "<segment name>", "count": <number>, "avgSpend": <number>, "description": "<brief description>" }
  ],
  "atRiskCount": <number of at-risk customers>,
  "retentionRate": <estimated retention percentage>,
  "reactivationSuggestions": ["<specific actions to win back at-risk customers>"],
  "topPerformers": [{ "name": "<customer name>", "totalSpent": <amount>, "insight": "<why they're valuable>" }],
  "insights": "<2-3 sentence summary of customer health>",
  "growthOpportunities": ["<specific opportunities to increase customer value>"],
  "confidence": "high" | "medium" | "low"
}

Focus on actionable recommendations based on the actual data patterns.`;

    console.log("Calling Lovable AI Gateway for customer insights...");

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
            content: "You are a customer analytics AI. Always respond with valid JSON only.",
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

    console.log("AI customer insights received successfully");

    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      result = { 
        segments: [],
        atRiskCount: segments.atRisk,
        retentionRate: 0,
        reactivationSuggestions: ["Review customer data manually"],
        topPerformers: [],
        insights: "Unable to generate insights from data",
        confidence: "low",
        error: "Failed to parse AI response"
      };
    }

    return jsonResponse({ success: true, data: result }, cors);
  } catch (error) {
    console.error("AI Customer Insights error:", error);
    return errorResponse(error, cors);
  }
});
