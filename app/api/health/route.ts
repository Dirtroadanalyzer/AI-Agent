export async function GET() {
  return Response.json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), supabaseConfigured: Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SECRET_KEY), service: "Dirt Road Property Analyzer" });
}
