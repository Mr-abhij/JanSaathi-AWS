import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { callBedrockText } from "../_shared/bedrock.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMES = [
  { name: "PM Kisan Samman Nidhi", url: "https://pmkisan.gov.in/", deadline: "Open year-round", criteria: "Farmers with <2 hectare land, income <₹200,000" },
  { name: "PM Awas Yojana (PMAY)", url: "https://pmaymis.gov.in/", deadline: "Apply before March 2026", criteria: "EWS/LIG, income <₹300,000" },
  { name: "Sukanya Samriddhi Yojana", url: "https://www.india.gov.in/sukanya-samriddhi-yojna", deadline: "Before girl turns 10", criteria: "Parents of girl child under 10" },
  { name: "PM Mudra Yojana", url: "https://www.mudra.org.in/", deadline: "Open year-round", criteria: "Self-employed/Business owners" },
  { name: "National Scholarship Portal", url: "https://scholarships.gov.in/", deadline: "July-October each year", criteria: "Students, SC/ST/OBC/Minority, income <₹250,000" },
  { name: "PM Ujjwala Yojana", url: "https://www.pmujjwalayojana.com/", deadline: "Open year-round", criteria: "BPL/SC/ST women, income <₹100,000" },
  { name: "Ayushman Bharat (PMJAY)", url: "https://pmjay.gov.in/", deadline: "Open year-round", criteria: "All categories, income <₹500,000" },
  { name: "Stand Up India", url: "https://www.standupmitra.in/", deadline: "Open year-round", criteria: "SC/ST or Women entrepreneurs" },
  { name: "PM Vishwakarma", url: "https://pmvishwakarma.gov.in/", deadline: "Registration open till 2028", criteria: "Traditional artisans/craftsmen" },
  { name: "Karnataka Bhagya Lakshmi", url: "https://dwcd.karnataka.gov.in/", deadline: "Within 1 year of girl child birth", criteria: "Karnataka BPL families, income <₹120,000" },
  { name: "Vidyasiri Scholarship", url: "https://karepass.cgg.gov.in/", deadline: "August-September each year", criteria: "Karnataka students, SC/ST/OBC" },
  { name: "UP Kanya Sumangala Yojana", url: "https://mksy.up.gov.in/", deadline: "Open year-round", criteria: "UP residents, income <₹300,000, girl child" },
  { name: "Mahatma Gandhi NREGA", url: "https://nrega.nic.in/", deadline: "Open year-round", criteria: "Rural laborers, all categories" },
  { name: "PM Garib Kalyan Anna Yojana", url: "https://nfsa.gov.in/", deadline: "Extended till December 2028", criteria: "BPL/Antyodaya, income <₹100,000" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile } = await userClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found. Please complete your profile first.");

    const profileSummary = `Age: ${profile.age || "unknown"}, State: ${profile.state || "unknown"}, Occupation: ${profile.occupation || "unknown"}, Annual Income: ₹${profile.annual_income || "unknown"}, Category: ${profile.category || "unknown"}, Gender: ${profile.gender || "unknown"}`;
    const schemesJson = JSON.stringify(SCHEMES.map(s => ({ name: s.name, criteria: s.criteria, deadline: s.deadline })));

    // Use Amazon Bedrock for AI matching
    const responseText = await callBedrockText({
      messages: [
        {
          role: "user",
          content: `Profile: ${profileSummary}\n\nSchemes: ${schemesJson}`,
        },
      ],
      systemPrompt: `You are a scheme eligibility matcher. Given a user profile and list of schemes, return ONLY a JSON array of matched scheme names (the ones the user is likely eligible for). Return at most 5 best matches. Output ONLY valid JSON array of strings, no explanation.`,
      modelId: "amazon.nova-micro-v1:0",
      maxTokens: 512,
    });

    let matchedNames: string[] = [];
    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      matchedNames = JSON.parse(cleaned);
    } catch {
      matchedNames = [];
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existing } = await adminClient
      .from("notifications")
      .select("scheme_name")
      .eq("user_id", user.id)
      .eq("type", "scheme_alert");

    const existingNames = new Set((existing || []).map(n => n.scheme_name));
    const matchedSchemes = SCHEMES.filter(s => matchedNames.includes(s.name) && !existingNames.has(s.name));

    if (matchedSchemes.length > 0) {
      const notifications = matchedSchemes.map(scheme => ({
        user_id: user.id,
        title: `📋 You may be eligible for ${scheme.name}!`,
        message: `Based on your profile, you could qualify for this scheme. Deadline: ${scheme.deadline}`,
        type: "scheme_alert",
        scheme_name: scheme.name,
        scheme_url: scheme.url,
        deadline: scheme.deadline,
      }));
      await adminClient.from("notifications").insert(notifications);
    }

    const { data: savedSchemes } = await userClient
      .from("saved_schemes")
      .select("*")
      .eq("user_id", user.id);

    if (savedSchemes && savedSchemes.length > 0) {
      for (const scheme of savedSchemes) {
        if (scheme.deadline && !existingNames.has(`deadline_${scheme.scheme_name}`)) {
          await adminClient.from("notifications").insert({
            user_id: user.id,
            title: `⏰ Deadline reminder: ${scheme.scheme_name}`,
            message: `Don't miss the deadline: ${scheme.deadline}. Apply now!`,
            type: "deadline_alert",
            scheme_name: `deadline_${scheme.scheme_name}`,
            scheme_url: scheme.scheme_url,
            deadline: scheme.deadline,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        matched: matchedSchemes.length,
        schemes: matchedSchemes.map(s => s.name),
        message: `Found ${matchedSchemes.length} new scheme matches for your profile!`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("match-schemes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
