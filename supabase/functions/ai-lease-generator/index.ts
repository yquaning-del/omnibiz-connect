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
    'US-CA': 'California Civil Code Section 1950.5 limits security deposits to 2 months rent for unfurnished units. Landlords must return deposits within 21 days with itemized deductions. California has strict rent control in some cities. AB 1482 caps annual rent increases at 5% plus inflation. 24-hour notice required for landlord entry.',
    'US-NY': 'New York requires landlords to place security deposits in interest-bearing accounts. Security deposits are limited to one month rent for rent-stabilized apartments. Housing Stability and Tenant Protection Act of 2019 provides strong tenant protections. 24-hour notice required for non-emergency entry.',
    'US-TX': 'Texas Property Code Chapter 92 governs landlord-tenant relationships. Security deposits must be returned within 30 days with itemized deductions. No statewide rent control. Landlords must provide written lease. Reasonable notice required for entry.',
    'US-FL': 'Florida Statute 83 requires 15-60 days notice for non-payment eviction. Security deposits must be held in a Florida bank (interest-bearing optional) and returned within 15-60 days depending on claims. No rent control. 12-hour notice for entry except emergencies.',
    'GH': 'Ghana Rent Control Act 1963 (Act 220) governs tenancy. Rent Advance should not exceed 6 months for residential properties. Tenants have 3 months notice rights. Rent Control Department handles disputes. Landlord must provide receipts.',
    'GH-ACCRA': 'In Accra, the Rent Control Department actively handles disputes. Maximum advance rent is 6 months per Rent Act 220. Landlords must provide receipts for all payments. Tenancy agreements should be in writing.',
    'NG': 'Nigerian Tenancy Law varies by state. Lagos State Tenancy Law 2011 requires proper notice periods (one month for monthly tenancies). Rent is typically paid annually in advance. Written agreements recommended. Recovery of Premises Act applies.',
    'KE': 'Kenya Rent Restriction Act applies to older properties in certain areas. The Rent Restriction Tribunal handles disputes. Security deposits are typically 1-2 months rent. Landlord and Tenant Act governs commercial properties.',
    'ZA': 'South African Rental Housing Act 50 of 1999 governs residential tenancies. Security deposits limited to 2 months rent and must earn interest. Rental Housing Tribunals handle disputes. Consumer Protection Act also applies. Written lease required.',
    'GB': 'UK Tenant Fees Act 2019 limits deposits to 5 weeks rent (or 6 weeks if annual rent exceeds £50,000). Deposits must be protected in government scheme within 30 days. Section 21 notices require 2 months notice. Right to Rent checks required.',
    'CA': 'Canadian tenancy laws vary by province. Most provinces limit security deposits to one month rent (half month in some). Rent increases are regulated in Ontario and BC. Residential Tenancies Acts provide tenant protections. Written notice periods vary by province.',
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
  return contexts[country] || 'Standard landlord-tenant laws apply. Ensure compliance with local regulations. Written agreements are recommended. Both parties should understand their rights and obligations under applicable tenancy laws.';
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

    // Generating lease

    const jurisdictionContext = getJurisdictionContext(country, state, city);
    const templateSource = country === 'US' && state 
      ? `US-${state}` 
      : country === 'GH' && city 
      ? `GH-${city.toUpperCase()}`
      : country;

    const systemPrompt = `You are an expert legal document assistant specializing in residential lease agreements. Generate comprehensive, legally appropriate lease clauses based on the jurisdiction provided. Always include relevant local law references where applicable. Use clear, professional, and enforceable language. Provide detailed clauses that protect both landlord and tenant interests.`;

    const userPrompt = `Generate comprehensive lease clauses for a residential property with these details:

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

Generate the following lease clauses in JSON format. Each clause should be:
1. Jurisdiction-appropriate with specific law references where applicable
2. Detailed and comprehensive (2-3 paragraphs per section minimum)
3. Legally sound and enforceable
4. Clear and professional in language

{
  "legalNotices": ["array of 3-4 legal notice statements specific to this jurisdiction, including any required disclosures such as lead paint (pre-1978 US), mold, or bed bugs"],
  "rentTerms": "Comprehensive paragraph covering: exact payment amount (${leaseTerms.monthlyRent}), due date (1st of each month), accepted payment methods (check, money order, electronic transfer), prorated rent calculations for partial months, consequences of bounced checks or failed payments, and how payments should be delivered",
  "securityDepositRules": "Detailed section covering: deposit amount (${leaseTerms.securityDeposit}), where the deposit will be held, interest requirements per local law, itemized list of what deductions are allowed (unpaid rent, damages beyond normal wear and tear, cleaning costs), move-in/move-out walkthrough procedures, and exact timeline for return per local regulations",
  "lateFeePolicy": "Clear statement covering: grace period (${leaseTerms.gracePeriod} days), late fee amount (${leaseTerms.lateFee}), how fee is calculated (flat or percentage), cure period requirements, whether fees compound, and how partial payments are applied",
  "maintenanceResponsibilities": "Thorough division covering: LANDLORD responsibilities (structural repairs, roof, plumbing, electrical, HVAC servicing, appliance repairs if provided, pest control, common areas), TENANT responsibilities (routine cleaning, light bulbs, smoke detector batteries, HVAC filter changes, lawn care if applicable, prompt reporting of issues), emergency repair procedures with contact information, and timelines for addressing maintenance requests",
  "terminationConditions": "Complete coverage of: standard lease end procedures, required notice periods for both parties, early termination options and associated fees/penalties, lease buyout provisions if available, renewal procedures, holdover tenancy terms and rates, and conditions for immediate termination (illegal activity, health/safety violations)",
  "utilitiesAndServices": "Specify clearly: which utilities landlord provides (water, sewer, trash, etc.), which utilities tenant must pay (electricity, gas, internet, cable), meter transfer requirements and timeline, responsibility for utility bills during vacancy, and trash/recycling collection procedures",
  "petPolicy": "Cover comprehensively: whether pets are allowed, breed and weight restrictions, number of pets allowed, required pet deposit amount, monthly pet rent if applicable, vaccination and licensing requirements, liability for pet damage, consequences for unauthorized pets, and service animal/emotional support animal exceptions with documentation requirements",
  "noiseAndConduct": "Include: quiet hours (typically 10pm-8am), prohibited activities (loud music, parties, illegal activities), guest policies including maximum consecutive nights (typically 7) and total nights per month (typically 14), commercial activity restrictions, nuisance behavior definitions, and neighbor complaint procedures",
  "entryAndInspection": "Specify: landlord's right to enter for inspections/repairs/showings, required notice period per local law (typically 24-48 hours), emergency access rights without notice (fire, flood, immediate danger), regular inspection schedule (quarterly), and how entry requests will be communicated",
  "insuranceRequirements": "Cover: whether renter's insurance is required, minimum liability coverage amount (typically $100,000), minimum personal property coverage (typically $25,000), requirement to name landlord as interested party, proof of insurance requirements and timeline, and consequences for lapse in coverage",
  "alterationsPolicy": "Explain: what modifications require prior written approval (painting, wallpaper, fixtures, satellite dishes, security systems, smart home devices), reversibility requirements, landlord's right to approve/deny, whether improvements become landlord property, and restoration requirements at move-out",
  "sublettingPolicy": "Cover: whether subletting/assignment is permitted, approval process and timeline, required subletting fee if applicable, subtenant application requirements, original tenant's continuing liability, and Airbnb/short-term rental restrictions",
  "additionalClauses": ["array of 2-4 additional jurisdiction-specific required clauses such as: mold disclosure, lead paint disclosure (pre-1978), bed bug history, crime-free housing addendum, military clause for SCRA compliance, or other legally required disclosures"]
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
      console.error("AI gateway error:", response.status);
      
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

    // AI response received, parsing clauses

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

    // Validate and ensure all required fields exist
    const requiredFields = [
      'legalNotices', 'rentTerms', 'securityDepositRules', 'lateFeePolicy', 
      'maintenanceResponsibilities', 'terminationConditions', 'utilitiesAndServices',
      'petPolicy', 'noiseAndConduct', 'entryAndInspection', 'insuranceRequirements',
      'alterationsPolicy', 'sublettingPolicy', 'additionalClauses'
    ];
    
    for (const field of requiredFields) {
      if (!clauses[field]) {
        if (field === 'legalNotices' || field === 'additionalClauses') {
          clauses[field] = [];
        } else {
          clauses[field] = 'To be specified by landlord in accordance with local laws.';
        }
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

    console.log("Comprehensive lease generation successful:", templateSource);

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
