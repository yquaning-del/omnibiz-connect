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
    const { vertical, organizationId, locationId } = await req.json();
    console.log(`AI Demand Forecast: ${vertical} for org ${organizationId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch historical data based on vertical
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let contextData: any = {};

    if (vertical === "restaurant") {
      // Get reservation and order patterns
      const [reservationsRes, ordersRes] = await Promise.all([
        supabase
          .from("reservations")
          .select("check_in, guest_count, status")
          .eq("organization_id", organizationId)
          .eq("reservation_type", "table")
          .gte("check_in", thirtyDaysAgo.toISOString())
          .order("check_in", { ascending: false }),
        supabase
          .from("orders")
          .select("created_at, total_amount, status")
          .eq("organization_id", organizationId)
          .eq("vertical", "restaurant")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      // Group by day of week and hour
      const hourlyPattern: Record<number, number[]> = {};
      const dayPattern: Record<number, number[]> = {};
      
      ordersRes.data?.forEach((order: any) => {
        const date = new Date(order.created_at);
        const hour = date.getHours();
        const day = date.getDay();
        
        if (!hourlyPattern[hour]) hourlyPattern[hour] = [];
        hourlyPattern[hour].push(Number(order.total_amount));
        
        if (!dayPattern[day]) dayPattern[day] = [];
        dayPattern[day].push(Number(order.total_amount));
      });

      const avgByHour: Record<number, number> = {};
      Object.entries(hourlyPattern).forEach(([hour, amounts]) => {
        avgByHour[Number(hour)] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      });

      const avgByDay: Record<number, number> = {};
      Object.entries(dayPattern).forEach(([day, amounts]) => {
        avgByDay[Number(day)] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      });

      contextData = {
        totalOrders: ordersRes.data?.length || 0,
        totalReservations: reservationsRes.data?.length || 0,
        avgOrderValue: ordersRes.data?.length 
          ? ordersRes.data.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) / ordersRes.data.length 
          : 0,
        avgGuestCount: reservationsRes.data?.length
          ? reservationsRes.data.reduce((sum: number, r: any) => sum + r.guest_count, 0) / reservationsRes.data.length
          : 0,
        hourlyPattern: avgByHour,
        dayOfWeekPattern: avgByDay,
      };
    } else if (vertical === "hotel") {
      const [reservationsRes, foliosRes] = await Promise.all([
        supabase
          .from("reservations")
          .select("check_in, check_out, guest_count, status")
          .eq("location_id", locationId || organizationId)
          .eq("reservation_type", "room")
          .gte("check_in", thirtyDaysAgo.toISOString())
          .order("check_in", { ascending: false }),
        supabase
          .from("guest_folios")
          .select("total_amount, created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      // Group by day of week
      const dayPattern: Record<number, number> = {};
      reservationsRes.data?.forEach((res: any) => {
        const day = new Date(res.check_in).getDay();
        dayPattern[day] = (dayPattern[day] || 0) + 1;
      });

      contextData = {
        totalReservations: reservationsRes.data?.length || 0,
        avgRevenue: foliosRes.data?.length 
          ? foliosRes.data.reduce((sum: number, f: any) => sum + Number(f.total_amount || 0), 0) / foliosRes.data.length 
          : 0,
        checkInsByDayOfWeek: dayPattern,
        avgGuestCount: reservationsRes.data?.length
          ? reservationsRes.data.reduce((sum: number, r: any) => sum + r.guest_count, 0) / reservationsRes.data.length
          : 0,
      };
    }

    const todayDayName = new Date().toLocaleDateString("en", { weekday: "long" });
    const tomorrowDayName = new Date(Date.now() + 86400000).toLocaleDateString("en", { weekday: "long" });

    const prompt = `You are a business analytics AI specializing in demand forecasting. Analyze this historical data and predict demand for today (${todayDayName}) and tomorrow (${tomorrowDayName}).

Vertical: ${vertical}
Historical Data (last 30 days):
${JSON.stringify(contextData, null, 2)}

Provide a JSON response with:
{
  "demandLevel": "high" | "medium" | "low",
  "predictedCovers": <number of expected guests/customers today>,
  "predictedRevenue": <expected revenue today>,
  "peakHours": [<array of peak hour times like "12:00", "19:00">],
  "staffingRecommendation": "<specific staffing advice>",
  "prepRecommendations": ["<array of preparation tips>"],
  "tomorrowOutlook": "<brief outlook for tomorrow>",
  "confidence": "high" | "medium" | "low"
}

Be specific and actionable. Base predictions on the patterns in the data.`;

    console.log("Calling Lovable AI Gateway for demand forecast...");

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
            content: "You are a demand forecasting AI. Always respond with valid JSON only.",
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

    console.log("AI demand forecast received successfully");

    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      result = { 
        demandLevel: "medium",
        predictedCovers: 0,
        peakHours: [],
        staffingRecommendation: "Unable to generate specific recommendation",
        prepRecommendations: ["Review historical patterns manually"],
        confidence: "low",
        error: "Failed to parse AI response"
      };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Demand Forecast error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
