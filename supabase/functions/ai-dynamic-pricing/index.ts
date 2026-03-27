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
    // Dynamic pricing request validated

    // Use service role for data queries
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let contextData: any = {};
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    if (vertical === "hotel") {
      // Get current room inventory and rates
      const [roomsRes, reservationsRes, historicalRes] = await Promise.all([
        adminSupabase
          .from("hotel_rooms")
          .select("id, room_number, room_type, base_rate, status")
          .eq("location_id", locationId),
        adminSupabase
          .from("reservations")
          .select("room_id, check_in, check_out, status")
          .eq("location_id", locationId)
          .eq("reservation_type", "room")
          .gte("check_in", today)
          .lte("check_in", nextWeek),
        adminSupabase
          .from("guest_folios")
          .select("total_amount, room_charges, created_at")
          .eq("location_id", locationId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const rooms = roomsRes.data || [];
      const reservations = reservationsRes.data || [];
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === "occupied").length;
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      // Group by room type
      const roomTypes: Record<string, { count: number; occupied: number; avgRate: number }> = {};
      rooms.forEach((room: any) => {
        const type = room.room_type || "Standard";
        if (!roomTypes[type]) {
          roomTypes[type] = { count: 0, occupied: 0, avgRate: 0 };
        }
        roomTypes[type].count++;
        roomTypes[type].avgRate += Number(room.base_rate || 100);
        if (room.status === "occupied") roomTypes[type].occupied++;
      });

      Object.keys(roomTypes).forEach(type => {
        roomTypes[type].avgRate = roomTypes[type].avgRate / roomTypes[type].count;
      });

      // Calculate booking velocity (reservations per day)
      const upcomingBookings = reservations.length;
      const bookingVelocity = upcomingBookings / 7;

      contextData = {
        totalRooms,
        occupiedRooms,
        occupancyRate: occupancyRate.toFixed(1),
        roomTypes,
        upcomingReservationsNext7Days: upcomingBookings,
        bookingVelocity: bookingVelocity.toFixed(2),
        avgHistoricalRevenue: historicalRes.data?.length 
          ? historicalRes.data.reduce((sum: number, f: any) => sum + Number(f.total_amount || 0), 0) / historicalRes.data.length
          : 0,
      };
    } else if (vertical === "property") {
      // Get property units and lease data
      const [unitsRes, leasesRes] = await Promise.all([
        adminSupabase
          .from("property_units")
          .select("id, unit_number, unit_type, bedrooms, bathrooms, monthly_rent, status")
          .eq("organization_id", organizationId),
        adminSupabase
          .from("leases")
          .select("monthly_rent, start_date, end_date, status")
          .eq("organization_id", organizationId)
          .eq("status", "active"),
      ]);

      const units = unitsRes.data || [];
      const leases = leasesRes.data || [];
      const totalUnits = units.length;
      const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;
      const vacancyRate = totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0;

      // Group by unit type
      const unitTypes: Record<string, { count: number; avgRent: number }> = {};
      units.forEach((unit: any) => {
        const type = unit.unit_type || `${unit.bedrooms || 1}BR`;
        if (!unitTypes[type]) {
          unitTypes[type] = { count: 0, avgRent: 0 };
        }
        unitTypes[type].count++;
        unitTypes[type].avgRent += Number(unit.monthly_rent || 0);
      });

      Object.keys(unitTypes).forEach(type => {
        unitTypes[type].avgRent = unitTypes[type].avgRent / unitTypes[type].count;
      });

      contextData = {
        totalUnits,
        occupiedUnits,
        vacancyRate: vacancyRate.toFixed(1),
        unitTypes,
        activeLeases: leases.length,
        avgMonthlyRent: leases.length
          ? leases.reduce((sum: number, l: any) => sum + Number(l.monthly_rent), 0) / leases.length
          : 0,
      };
    }

    const prompt = `You are a revenue management AI specializing in dynamic pricing for ${vertical === "hotel" ? "hotels" : "rental properties"}.

Current Data:
${JSON.stringify(contextData, null, 2)}

Today: ${new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}

Analyze the occupancy, demand patterns, and market conditions to provide pricing recommendations.

Respond with JSON:
{
  "recommendations": [
    {
      "${vertical === "hotel" ? "roomType" : "unitType"}": "<type name>",
      "currentRate": <current average rate>,
      "suggestedRate": <recommended rate>,
      "changePercent": <percentage change>,
      "reason": "<brief justification>"
    }
  ],
  "overallStrategy": "<1-2 sentence pricing strategy>",
  "demandOutlook": "<market demand assessment>",
  "urgentActions": ["<any immediate pricing actions needed>"],
  "confidence": "high" | "medium" | "low"
}

Be specific with rate recommendations based on the occupancy and demand signals.`;

    

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
            content: "You are a revenue management AI. Always respond with valid JSON only.",
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
        recommendations: [],
        overallStrategy: "Unable to generate pricing strategy",
        demandOutlook: "Insufficient data",
        confidence: "low",
        error: "Failed to parse AI response"
      };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
