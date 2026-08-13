import { getSupabaseAdmin } from "../../../lib/supabase-admin";

function validId(value:string){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!validId(id))return Response.json({ok:false,error:"Invalid request identifier."},{status:400});
  const body=await request.json();const responseText=String(body.responseText||"").trim().slice(0,12000);
  if(!responseText)return Response.json({ok:false,error:"Enter an answer or document reference."},{status:400});
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});
  const requestRow=await db.from("action_requests").select("id,case_id,title,priority").eq("id",id).single();
  if(requestRow.error)return Response.json({ok:false,error:requestRow.error.message},{status:404});
  const evidence=await db.from("evidence").insert({case_id:requestRow.data.case_id,category:"user_input",evidence_type:"user_supplied",source_name:"Team response",source_identifier:requestRow.data.title,fact:responseText,verification_status:"unverified"}).select("id").single();
  if(evidence.error)return Response.json({ok:false,error:`Could not preserve response: ${evidence.error.message}`},{status:500});
  const completedAt=new Date().toISOString();const updated=await db.from("action_requests").update({response_text:responseText,response_evidence_id:evidence.data.id,status:"answered",completed_at:completedAt}).eq("id",id).select("*").single();
  if(updated.error)return Response.json({ok:false,error:`Could not update request: ${updated.error.message}`},{status:500});
  const open=await db.from("action_requests").select("priority").eq("case_id",requestRow.data.case_id).eq("status","open");
  const critical=open.data?.filter(x=>x.priority==="critical").length||0;const important=open.data?.filter(x=>x.priority==="important").length||0;
  await db.from("cases").update({status:critical?"waiting_for_input":"professional_review",readiness:Math.max(25,100-critical*12-important*5)}).eq("id",requestRow.data.case_id);
  return Response.json({ok:true,action:updated.data,evidenceId:evidence.data.id});
}
