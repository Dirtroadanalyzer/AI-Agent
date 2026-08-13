import OpenAI from "openai";

export const maxDuration = 60;

function normalizeApn(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return Response.json({ ok: false, error: "The OpenAI connection is not configured." }, { status: 503 });
    const body = await request.json();
    const apn = normalizeApn(body.apn);
    const objective = String(body.objective || "General acquisition and highest-and-best-use analysis").trim().slice(0, 1200);
    if (!apn) return Response.json({ ok: false, error: "Enter a valid eight-digit Mohave County APN." }, { status: 400 });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      tools: [{ type: "web_search" }],
      input: `You are the research engine for Dirt Road Property Analyzer, serving licensed real-estate professionals in Mohave County, Arizona.

Research Mohave County APN ${apn}. User objective: ${objective || "General acquisition and highest-and-best-use analysis"}.

Search current public sources deeply, prioritizing official Mohave County, State of Arizona, FEMA and utility/fire authority sources. Never invent a parcel fact. Distinguish VERIFIED, INFERRED, NOT FOUND and REQUIRES PROFESSIONAL VERIFICATION. If an official portal cannot be accessed, state the exact limitation and identify the manual verification path. An APN match must be confirmed before attributing facts to the parcel.

Return a clear plain-text report using these headings:
1. EXECUTIVE DECISION SUMMARY
2. PARCEL IDENTITY AND LOCATION
3. OWNERSHIP/RECORDER/TITLE FLAGS
4. ZONING, GENERAL PLAN AND ALLOWED-USE QUESTIONS
5. LEGAL AND PHYSICAL ACCESS
6. FLOOD, DRAINAGE AND TOPOGRAPHY
7. WATER AND WELL RESEARCH
8. SEPTIC/SOILS/WASTEWATER
9. ELECTRIC, COMMUNICATIONS AND OTHER UTILITIES
10. FIRE/EMERGENCY SERVICE AND WATER-STORAGE CONSIDERATIONS
11. ENVIRONMENTAL/PERMIT CONSTRAINTS
12. MARKET POSITION AND HIGHEST-AND-BEST-USE OPTIONS
13. TINY-HOME OR COTTAGE-COMMUNITY SCREEN
14. PRELIMINARY COST/RISK TIERS
15. NEGOTIATION LEVERAGE AND OFFER CONDITIONS
16. BUYER DUE-DILIGENCE ACTION PLAN
17. SOURCE REGISTER
18. LIMITATIONS AND PROFESSIONAL-REVIEW NOTICE

For every important statement, identify the source URL and access date when available. Rank use scenarios and explain what would make each viable or eliminate it. Do not claim title status, buildability, legal access, septic suitability, water availability or zoning approval without authoritative evidence. Keep the report useful and specific, not generic.`,
    });
    const report = response.output_text?.trim();
    if (!report) throw new Error("The research service returned no report.");
    return Response.json({ ok: true, apn, report, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Analysis failed", error);
    return Response.json({ ok: false, error: "The research request failed. Retry once; if it continues, review the Vercel function log." }, { status: 500 });
  }
}
