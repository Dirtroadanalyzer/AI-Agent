import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

function validId(value:string){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)}
const decisions:Record<string,string>={save:"approval_pending",approve:"approved",reject:"rejected",reopen:"approval_pending"};

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!validId(id))return Response.json({ok:false,error:"Invalid communication identifier."},{status:400});const body=await request.json();const decision=String(body.decision||"save");if(!decisions[decision])return Response.json({ok:false,error:"Invalid approval decision."},{status:400});const draft=String(body.draft||"").trim().slice(0,16000);if(!draft)return Response.json({ok:false,error:"The communication draft is empty."},{status:400});
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});const row=await db.from("action_requests").select("id,case_id,title,question,status").eq("id",id).single();if(row.error)return Response.json({ok:false,error:row.error.message},{status:404});if(!String(row.data.title).startsWith("[TC]"))return Response.json({ok:false,error:"Only transaction-coordinator tasks can use this approval workflow."},{status:400});
  const timestamp=new Date().toISOString();const history=`\n\n--- APPROVAL EVENT ${timestamp} ---\nDecision: ${decision.toUpperCase()}`;const result=await db.from("action_requests").update({response_text:`${draft}${history}`,status:decisions[decision],completed_at:decision==="approve"||decision==="reject"?timestamp:null}).eq("id",id).select("*").single();if(result.error)return Response.json({ok:false,error:`Could not update approval: ${result.error.message}`},{status:500});return Response.json({ok:true,action:result.data,sendEnabled:false,message:decision==="approve"?"Approved and preserved. External sending is not connected yet.":"Approval state preserved."});
}
