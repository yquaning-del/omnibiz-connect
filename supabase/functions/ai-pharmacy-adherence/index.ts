import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreFlight, getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth, verifyOrgAccess } from "../_shared/auth.ts";
import { validateRequired, validateUUID } from "../_shared/validation.ts";
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

    // Verify user has access to the organization
    const hasAccess = await verifyOrgAccess(supabase, userId, organizationId);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: "Access denied to this organization" }, cors, 403);
    }

    console.log(`AI Pharmacy Adherence for org ${organizationId}`);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch prescription data with patient info
    const [prescriptionsRes, prescriptionItemsRes] = await Promise.all([
      supabase
        .from("prescriptions")
        .select(`
          id, prescription_number, patient_id, status, date_written, date_filled,
          refills_authorized, refills_remaining, created_at
        `)
        .eq("organization_id", organizationId)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("prescription_items")
        .select("prescription_id, medication_name, quantity, days_supply")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const prescriptions = prescriptionsRes.data || [];
    const prescriptionItems = prescriptionItemsRes.data || [];

    // Build patient adherence profiles
    const patientData: Record<string, {
      prescriptionCount: number;
      filledCount: number;
      refillsUsed: number;
      refillsAvailable: number;
      medications: string[];
      lastFillDate: string | null;
      overdueRefills: number;
    }> = {};

    prescriptions.forEach((rx: any) => {
      const patientId = rx.patient_id || "unknown";
      if (!patientData[patientId]) {
        patientData[patientId] = {
          prescriptionCount: 0,
          filledCount: 0,
          refillsUsed: 0,
          refillsAvailable: 0,
          medications: [],
          lastFillDate: null,
          overdueRefills: 0,
        };
      }

      patientData[patientId].prescriptionCount++;
      if (rx.status === "dispensed" || rx.date_filled) {
        patientData[patientId].filledCount++;
        if (rx.date_filled && (!patientData[patientId].lastFillDate || rx.date_filled > patientData[patientId].lastFillDate)) {
          patientData[patientId].lastFillDate = rx.date_filled;
        }
      }

      patientData[patientId].refillsUsed += (rx.refills_authorized || 0) - (rx.refills_remaining || 0);
      patientData[patientId].refillsAvailable += rx.refills_remaining || 0;

      if (rx.refills_remaining > 0 && rx.date_filled) {
        const daysSinceFill = Math.floor((Date.now() - new Date(rx.date_filled).getTime()) / 86400000);
        if (daysSinceFill > 30) {
          patientData[patientId].overdueRefills++;
        }
      }
    });

    // Get medication names for each prescription
    prescriptionItems.forEach((item: any) => {
      const rx = prescriptions.find((p: any) => p.id === item.prescription_id);
      if (rx && rx.patient_id && patientData[rx.patient_id]) {
        if (!patientData[rx.patient_id].medications.includes(item.medication_name)) {
          patientData[rx.patient_id].medications.push(item.medication_name);
        }
      }
    });

    // Calculate overall adherence metrics
    const patients = Object.entries(patientData);
    const totalPatients = patients.length;
    const adherentPatients = patients.filter(([_, data]) => 
      data.prescriptionCount > 0 && data.filledCount / data.prescriptionCount >= 0.8
    ).length;
    const overallAdherence = totalPatients > 0 ? (adherentPatients / totalPatients) * 100 : 0;

    // Find at-risk patients
    const atRiskPatients = patients
      .filter(([_, data]) => data.overdueRefills > 0 || (data.prescriptionCount > 1 && data.filledCount / data.prescriptionCount < 0.7))
      .map(([id, data]) => ({
        patientId: id,
        adherenceRate: data.prescriptionCount > 0 ? Math.round((data.filledCount / data.prescriptionCount) * 100) : 0,
        overdueRefills: data.overdueRefills,
        medications: data.medications.slice(0, 3),
        daysSinceLastFill: data.lastFillDate 
          ? Math.floor((Date.now() - new Date(data.lastFillDate).getTime()) / 86400000)
          : null,
      }))
      .sort((a, b) => a.adherenceRate - b.adherenceRate)
      .slice(0, 10);

    const upcomingRefills = patients.filter(([_, data]) => data.refillsAvailable > 0).length;

    const contextData = {
      totalPatients,
      overallAdherenceRate: overallAdherence.toFixed(1),
      patientsWithPerfectAdherence: patients.filter(([_, d]) => d.prescriptionCount === d.filledCount && d.prescriptionCount > 0).length,
      patientsAtRisk: atRiskPatients.length,
      atRiskDetails: atRiskPatients,
      upcomingRefills,
      totalPrescriptions: prescriptions.length,
      prescriptionsFilled: prescriptions.filter((p: any) => p.status === "dispensed").length,
    };

    const prompt = `You are a pharmacy adherence AI. Analyze this patient medication adherence data and provide insights.

Adherence Data:
${JSON.stringify(contextData, null, 2)}

Provide a JSON response with:
{
  "adherenceRate": <overall adherence percentage as number>,
  "patientsAtRisk": [
    {
      "patientId": "<identifier>",
      "medication": "<primary medication of concern>",
      "daysOverdue": <days since expected refill>,
      "riskLevel": "high" | "medium" | "low",
      "intervention": "<recommended outreach action>"
    }
  ],
  "upcomingRefills": <count of patients with available refills>,
  "interventionRecommendations": ["<specific intervention strategies>"],
  "adherenceInsights": "<2-3 sentence analysis of adherence patterns>",
  "highRiskMedications": ["<medications with worst adherence>"],
  "successStrategies": ["<what's working well>"],
  "confidence": "high" | "medium" | "low"
}

Focus on actionable outreach recommendations to improve patient adherence.`;

    console.log("Calling Lovable AI Gateway for pharmacy adherence...");

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
            content: "You are a pharmacy adherence analytics AI. Always respond with valid JSON only. Protect patient privacy - use only IDs, not names.",
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

    console.log("AI pharmacy adherence received successfully");

    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      result = { 
        adherenceRate: overallAdherence,
        patientsAtRisk: [],
        upcomingRefills,
        interventionRecommendations: ["Review patient records manually"],
        adherenceInsights: "Unable to generate insights from data",
        confidence: "low",
        error: "Failed to parse AI response"
      };
    }

    return jsonResponse({ success: true, data: result }, cors);
  } catch (error) {
    console.error("AI Pharmacy Adherence error:", error);
    return errorResponse(error, cors);
  }
});
