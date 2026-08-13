import { getSupabaseAdmin } from "../../lib/supabase-admin";

function normalizeApn(value: unknown) { const digits=String(value||"").replace(/\D/g,""); return digits.length===8?`${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`:null }

export async function POST(request:Request){
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});
  const body=await request.json();const apn=normalizeApn(body.apn);if(!apn)return Response.json({ok:false,error:"Invalid APN."},{status:400});
  const {data,error}=await db.from("cases").insert({apn,title:`APN ${apn}`,objective:String(body.objective||"").slice(0,1600),property_types:Array.isArray(body.propertyTypes)?body.propertyTypes:[],fire_service_input:String(body.fireService||"Unknown"),status:"screening"}).select("id,apn,status,created_at").single();
  if(error)return Response.json({ok:false,error:`Could not create case: ${error.message}`},{status:500});return Response.json({ok:true,case:data});
}

export async function GET(){
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});
  const {data,error}=await db.from("cases").select("id,apn,title,status,confidence,readiness,created_at,updated_at").order("updated_at",{ascending:false}).limit(25);
  if(error)return Response.json({ok:false,error:error.message},{status:500});return Response.json({ok:true,cases:data});
}
