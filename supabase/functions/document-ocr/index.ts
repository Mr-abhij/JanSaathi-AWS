import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, mimeType, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("API key not configured");

    const langNote = language === "hi" ? "Respond in Hindi." : language === "kn" ? "Respond in Kannada." : "Respond in English.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a document analysis AI for Indian government documents. Analyze the uploaded document image and extract information. ${langNote}

You MUST respond with a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "documentType": "Aadhaar Card" | "Income Certificate" | "Caste Certificate" | "PAN Card" | "Ration Card" | "Other",
  "name": "extracted name or '—' if not found",
  "documentNumber": "extracted number or '—'",
  "issueDate": "date string or null",
  "expiryDate": "date string or null",
  "isValid": true/false,
  "warnings": ["array of warning strings"],
  "fields": {"key": "value pairs for any additional extracted fields"}
}

Rules:
- If the document looks expired, set isValid to false and add a warning
- If the image is blurry or unreadable, add a warning
- Extract as many fields as possible
- For Aadhaar, mask all but last 4 digits
- ONLY output the JSON, nothing else`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please analyze this document image and extract the relevant information." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}` } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("OCR gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the response
    let parsed;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      parsed = {
        documentType: "Unknown",
        name: "—",
        documentNumber: "—",
        isValid: false,
        warnings: ["Could not extract structured data from this document."],
        fields: {},
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
