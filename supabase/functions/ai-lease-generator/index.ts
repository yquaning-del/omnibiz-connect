import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaseGenerationRequest {
  country: string;
  state?: string;
  city?: string;
  unitDetails: {
    type: string;
    bedrooms: number;
    address: string;
  };
  leaseTerms: {
    startDate: string;
    endDate?: string;
    monthlyRent: number;
    securityDeposit: number;
    lateFee: number;
    gracePeriod: number;
    leaseType: string;
  };
  tenantInfo: {
    name: string;
  };
}

function getJurisdictionContext(country: string, state?: string, city?: string): string {
  const contexts: Record<string, string> = {
    'US-CA': 'California Civil Code Section 1950.5 limits security deposits to 2 months rent for unfurnished units. Landlords must return deposits within 21 days. California has strict rent control in some cities.',
    'US-NY': 'New York requires landlords to place security deposits in interest-bearing accounts. Security deposits are limited to one month rent for rent-stabilized apartments.',
    'US-TX': 'Texas Property Code Chapter 92 governs landlord-tenant relationships. Security deposits must be returned within 30 days. No statewide rent control.',
    'US-FL': 'Florida Statute 83 requires 15-60 days notice for non-payment eviction. Security deposits must be held in a Florida bank and returned within 15-60 days.',
    'GH': 'Ghana Rent Control Act 1963 (Act 220) governs tenancy. Rent Advance should not exceed 6 months for residential properties. Tenants have 3 months notice rights.',
    'GH-ACCRA': 'In Accra, the Rent Control Department handles disputes. Maximum advance rent is 6 months. Landlords must provide receipts for all payments.',
    'NG': 'Nigerian Tenancy Law varies by state. Lagos State Tenancy Law 2011 requires proper notice periods. Rent is typically paid annually in advance.',
    'KE': 'Kenya Rent Restriction Act applies to older properties. The Rent Restriction Tribunal handles disputes. Security deposits are typically 1-2 months rent.',
    'ZA': 'South African Rental Housing Act 50 of 1999 governs. Security deposits limited to 2 months rent. Rental Housing Tribunals handle disputes.',
    'GB': 'UK Tenant Fees Act 2019 limits deposits to 5 weeks rent. Deposits must be protected in government scheme. Section 21 notices require 2 months notice.',
    'CA': 'Canadian tenancy laws vary by province. Most provinces limit security deposits to one month rent. Rent increases are regulated in Ontario and BC.',
  };

  // Try specific state/city match first
  if (country === 'US' && state) {
    const key = `US-${state}`;
    if (contexts[key]) return contexts[key];
  }
  
  if (country === 'GH' && city) {
    const key = `GH-${city.toUpperCase()}`;
    if (contexts[key]) return contexts[key];
  }

  // Fall back to country level
  return contexts[country] || 'Standard landlord-tenant laws apply. Ensure compliance with local regulations.';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const request: LeaseGenerationRequest = await req.json();
    const { country, state, city, unitDetails, leaseTerms, tenantInfo } = request;

    console.log("Generating lease for:", { country, state, city });

    const jurisdictionContext = getJurisdictionContext(country, state, city);
    const templateSource = country === 'US' && state 
      ? `US-${state}` 
      : country === 'GH' && city 
      ? `GH-${city.toUpperCase()}`
      : country;

    const systemPrompt = `You are a legal document assistant specializing in residential lease agreements. Generate legally appropriate lease clauses based on the jurisdiction provided. Always include relevant local law references where applicable. Keep language clear and professional.`;

    const userPrompt = `Generate lease clauses for a residential property with these details:

JURISDICTION: ${country}${state ? `, ${state}` : ''}${city ? `, ${city}` : ''}
LEGAL CONTEXT: ${jurisdictionContext}

PROPERTY DETAILS:
- Type: ${unitDetails.type}
- Bedrooms: ${unitDetails.bedrooms}
- Address: ${unitDetails.address || 'To be specified'}

LEASE TERMS:
- Start Date: ${leaseTerms.startDate}
- End Date: ${leaseTerms.endDate || 'Month-to-month'}
- Lease Type: ${leaseTerms.leaseType}
- Monthly Rent: ${leaseTerms.monthlyRent}
- Security Deposit: ${leaseTerms.securityDeposit}
- Late Fee: ${leaseTerms.lateFee}
- Grace Period: ${leaseTerms.gracePeriod} days

TENANT: ${tenantInfo.name}

Generate the following lease clauses in JSON format. Each clause should be jurisdiction-appropriate and legally sound:

{
  "legalNotices": ["array of 2-3 legal notice statements specific to this jurisdiction"],
  "rentTerms": "Detailed paragraph about rent payment terms, due dates, and accepted payment methods",
  "securityDepositRules": "Paragraph about security deposit handling, limits, and return conditions per local law",
  "lateFeePolicy": "Statement about late fees and grace period per local regulations",
  "maintenanceResponsibilities": "Clear division of landlord vs tenant maintenance duties",
  "terminationConditions": "How and when the lease can be terminated by either party",
  "additionalClauses": ["array of any other jurisdiction-specific required clauses"]
}

Return ONLY valid JSON, no markdown or explanations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing clauses...");

    // Parse the JSON from the response
    let clauses;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        clauses = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse lease clauses from AI");
    }

    // Validate required fields
    const requiredFields = ['legalNotices', 'rentTerms', 'securityDepositRules', 'lateFeePolicy', 'maintenanceResponsibilities', 'terminationConditions'];
    for (const field of requiredFields) {
      if (!clauses[field]) {
        clauses[field] = field === 'legalNotices' || field === 'additionalClauses' 
          ? [] 
          : 'To be specified by landlord.';
      }
    }

    // Ensure arrays are arrays
    if (!Array.isArray(clauses.legalNotices)) {
      clauses.legalNotices = [clauses.legalNotices].filter(Boolean);
    }
    if (!Array.isArray(clauses.additionalClauses)) {
      clauses.additionalClauses = clauses.additionalClauses ? [clauses.additionalClauses] : [];
    }

    const result = {
      success: true,
      data: {
        templateSource,
        clauses,
        jurisdiction: {
          country,
          state,
          city,
          applicableLaws: [jurisdictionContext],
        },
        confidence: "high" as const,
      },
    };

    console.log("Lease generation successful:", templateSource);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lease generation error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
