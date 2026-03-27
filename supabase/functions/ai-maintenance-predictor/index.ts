import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vertical, organizationId, locationId } = await req.json();
    

    // Use service role for data queries
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch maintenance history
    const { data: maintenanceData } = await adminSupabase
      .from("maintenance_requests")
      .select("id, title, category, priority, status, created_at, completed_at, actual_cost, room_id")
      .eq("location_id", locationId)
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    const maintenance = maintenanceData || [];

    // Analyze patterns by category
    const categoryStats: Record<string, { count: number; avgCost: number; avgResolutionDays: number; recurring: number }> = {};
    const locationIssues: Record<string, { count: number; categories: string[] }> = {};

    maintenance.forEach((m: any) => {
      const category = m.category || "general";
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, avgCost: 0, avgResolutionDays: 0, recurring: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].avgCost += Number(m.actual_cost || 0);

      if (m.completed_at) {
        const days = Math.floor((new Date(m.completed_at).getTime() - new Date(m.created_at).getTime()) / 86400000);
        categoryStats[category].avgResolutionDays += days;
      }

      // Track by location (room_id)
      if (m.room_id) {
        if (!locationIssues[m.room_id]) {
          locationIssues[m.room_id] = { count: 0, categories: [] };
        }
        locationIssues[m.room_id].count++;
        if (!locationIssues[m.room_id].categories.includes(category)) {
          locationIssues[m.room_id].categories.push(category);
        }
      }
    });

    // Calculate averages
    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      stats.avgCost = stats.count > 0 ? stats.avgCost / stats.count : 0;
      stats.avgResolutionDays = stats.count > 0 ? stats.avgResolutionDays / stats.count : 0;
    });

    // Find recurring issues (locations with 2+ issues)
    const recurringLocations = Object.entries(locationIssues)
      .filter(([_, data]) => data.count >= 2)
      .map(([id, data]) => ({ locationId: id, issueCount: data.count, categories: data.categories }))
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 5);

    // Open/pending requests
    const openRequests = maintenance.filter((m: any) => ["open", "in_progress"].includes(m.status));
    const highPriorityOpen = openRequests.filter((m: any) => m.priority === "high" || m.priority === "urgent");

    // Seasonal pattern detection
    const monthlyPattern: Record<number, number> = {};
    maintenance.forEach((m: any) => {
      const month = new Date(m.created_at).getMonth();
      monthlyPattern[month] = (monthlyPattern[month] || 0) + 1;
    });

    const contextData = {
      totalRequests: maintenance.length,
      openRequests: openRequests.length,
      highPriorityOpen: highPriorityOpen.length,
      categoryBreakdown: categoryStats,
      recurringIssueLocations: recurringLocations,
      monthlyPattern,
      avgCostPerRequest: maintenance.length > 0
        ? maintenance.reduce((sum: number, m: any) => sum + Number(m.actual_cost || 0), 0) / maintenance.length
        : 0,
    };

    const prompt = `You are a predictive maintenance AI for ${vertical === "hotel" ? "a hotel" : "a property management company"}. Analyze this maintenance history and predict upcoming issues.

Maintenance Data (last 90 days):
${JSON.stringify(contextData, null, 2)}

Current month: ${new Date().toLocaleDateString("en", { month: "long" })}

Provide a JSON response with:
{
  "predictions": [
    {
      "location": "<room/unit identifier or 'General'>",
      "category": "<maintenance category>",
      "riskLevel": "high" | "medium" | "low",
      "predictedFailure": "<timeframe like 'Within 2 weeks'>",
      "preventiveAction": "<specific recommended action>",
      "estimatedCost": <cost to prevent vs repair>
    }
  ],
  "costSavingPotential": "<estimated savings from preventive maintenance>",
  "maintenanceSchedule": ["<recommended scheduled maintenance items>"],
  "seasonalWarnings": ["<any seasonal issues to prepare for>"],
  "insights": "<2-3 sentence analysis of maintenance health>",
  "confidence": "high" | "medium" | "low"
}

Focus on actionable predictions based on recurring patterns and category trends.`;

    

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
            content: "You are a predictive maintenance AI. Always respond with valid JSON only.",
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
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    

    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      result = { 
        predictions: [],
        costSavingPotential: "Unable to calculate",
        maintenanceSchedule: ["Review maintenance logs manually"],
        seasonalWarnings: [],
        insights: "Unable to generate predictions from data",
        confidence: "low",
        error: "Failed to parse AI response"
      };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Maintenance Predictor error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
