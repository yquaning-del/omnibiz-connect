import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { medications, patientAllergies } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are a pharmaceutical AI assistant. Analyze the following medications for potential drug interactions and allergy concerns.

Medications being prescribed:
${medications.map((m: any) => `- ${m.name} (${m.dosage})`).join('\n')}

Patient allergies: ${patientAllergies?.length ? patientAllergies.join(', ') : 'None reported'}

Provide a JSON response with:
1. "interactions": Array of potential drug-drug interactions with severity (mild/moderate/severe/contraindicated)
2. "allergyWarnings": Array of any allergy concerns
3. "generalWarnings": Array of important warnings or precautions
4. "overallRisk": Overall risk level (low/medium/high/critical)
5. "recommendations": Brief recommendations for the pharmacist

Keep responses concise and clinically relevant.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a pharmaceutical AI that analyzes drug interactions. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = {
        interactions: [],
        allergyWarnings: [],
        generalWarnings: ['Unable to parse AI response'],
        overallRisk: 'unknown',
        recommendations: content
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Drug interaction check error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      interactions: [],
      allergyWarnings: [],
      generalWarnings: ['Error analyzing medications'],
      overallRisk: 'unknown',
      recommendations: 'Manual review required'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
