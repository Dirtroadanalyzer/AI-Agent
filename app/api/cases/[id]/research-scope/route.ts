import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
function validId(value:string){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!validId(id))return Response.json({ok:false,error:"Invalid case identifier."},{status:400});
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});
  const body=await request.json();const purpose=String(body.purpose||"Purchase inquiry").slice(0,120);const researchModules=Array.isArray(body.researchModules)?body.researchModules.map(String).slice(0,20):[];
  const existing=await db.from("action_requests").select("id").eq("case_id",id).eq("title","Research scope setup").order("created_at",{ascending:false}).limit(1);
  const values={case_id:id,priority:"important",title:"Research scope setup",question:"Saved working purpose and selected research modules.",reason:"Controls investigator groups and report scope.",requested_return:"Update from the property scope editor.",response_text:JSON.stringify({purpose,researchModules}),status:"answered",completed_at:new Date().toISOString()};
  const result=existing.data?.[0]?.id?await db.from("action_requests").update(values).eq("id",existing.data[0].id):await db.from("action_requests").insert(values);
  if(result.error)return Response.json({ok:false,error:result.error.message},{status:500});return Response.json({ok:true,purpose,researchModules});
}
