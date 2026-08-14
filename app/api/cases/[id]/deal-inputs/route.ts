import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

function validId(value:string){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)}
const fields=["askingPrice","sellerTerms","proposedOffer","financing","bedrooms","bathrooms","condition","garage","equipmentBuilding","power","hvac","well","septic","inspectionNotes","approvalStatus"] as const;

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!validId(id))return Response.json({ok:false,error:"Invalid case identifier."},{status:400});const body=await request.json();const inputs=Object.fromEntries(fields.map(key=>[key,String(body.inputs?.[key]||"").trim().slice(0,2500)]));
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});const existing=await db.from("action_requests").select("id").eq("case_id",id).eq("title","Structured deal inputs").order("created_at",{ascending:false}).limit(1);if(existing.error)return Response.json({ok:false,error:existing.error.message},{status:500});
  const values={case_id:id,priority:"important",title:"Structured deal inputs",question:"Complete transaction, property-condition and pricing facts for targeted valuation and negotiation analysis.",reason:"The acquisition recommendation must use transaction-specific facts rather than assumptions.",requested_return:"Asking price, terms, property characteristics, system conditions, inspection findings and professional approval status.",response_text:JSON.stringify(inputs),status:"answered",completed_at:new Date().toISOString()};
  const result=existing.data?.[0]?.id?await db.from("action_requests").update(values).eq("id",existing.data[0].id).select("*").single():await db.from("action_requests").insert(values).select("*").single();if(result.error)return Response.json({ok:false,error:`Could not preserve deal inputs: ${result.error.message}`},{status:500});return Response.json({ok:true,action:result.data,inputs});
}
