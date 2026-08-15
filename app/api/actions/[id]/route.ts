import { getSupabaseAdmin } from "../../../lib/supabase-admin";

function validId(value:string){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!validId(id))return Response.json({ok:false,error:"Invalid request identifier."},{status:400});
  const body=await request.json();const responseText=String(body.responseText||"").trim().slice(0,12000);
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});
  const requestRow=await db.from("action_requests").select("id,case_id,title,priority,response_text").eq("id",id).single();
  if(requestRow.error)return Response.json({ok:false,error:requestRow.error.message},{status:404});
  const disposition=String(body.disposition||"");
  if(["not_applicable","deferred","dismissed","open"].includes(disposition)){
    const note=responseText||({not_applicable:"User determined this request does not apply to the intended use.",deferred:"User deferred this request to a later due-diligence stage.",dismissed:"User dismissed this nonmaterial request.",open:"Request reopened for follow-up."} as Record<string,string>)[disposition];
    const updated=await db.from("action_requests").update({response_text:note,status:disposition,completed_at:disposition==="open"?null:new Date().toISOString()}).eq("id",id).select("*").single();
    if(updated.error)return Response.json({ok:false,error:`Could not update request: ${updated.error.message}`},{status:500});
    const open=await db.from("action_requests").select("priority").eq("case_id",requestRow.data.case_id).eq("status","open");
    const critical=open.data?.filter(x=>x.priority==="critical").length||0;const important=open.data?.filter(x=>x.priority==="important").length||0;
    await db.from("cases").update({status:critical?"waiting_for_input":"professional_review",readiness:Math.max(25,100-critical*12-important*5)}).eq("id",requestRow.data.case_id);
    return Response.json({ok:true,action:updated.data});
  }
  if(!responseText)return Response.json({ok:false,error:"Enter an answer or document reference."},{status:400});
  const preserved=body.append&&requestRow.data.response_text?`${requestRow.data.response_text}\n\nSUPPLEMENTAL INFORMATION:\n${responseText}`:responseText;
  const completedAt=new Date().toISOString();const updated=await db.from("action_requests").update({response_text:preserved,status:"answered",completed_at:completedAt}).eq("id",id).select("*").single();
  if(updated.error)return Response.json({ok:false,error:`Could not update request: ${updated.error.message}`},{status:500});
  const open=await db.from("action_requests").select("priority").eq("case_id",requestRow.data.case_id).eq("status","open");
  const critical=open.data?.filter(x=>x.priority==="critical").length||0;const important=open.data?.filter(x=>x.priority==="important").length||0;
  await db.from("cases").update({status:critical?"waiting_for_input":"professional_review",readiness:Math.max(25,100-critical*12-important*5)}).eq("id",requestRow.data.case_id);
  return Response.json({ok:true,action:updated.data});
}
