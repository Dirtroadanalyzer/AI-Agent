export async function GET() {
  return Response.json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), service: "Dirt Road Property Analyzer" });
}
