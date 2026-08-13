import { getSupabaseAdmin } from "../../../lib/supabase-admin";

function validId(value:string){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!validId(id))return Response.json({ok:false,error:"Invalid case identifier."},{status:400});
  const db=getSupabaseAdmin();if(!db)return Response.json({ok:false,error:"Supabase is not configured."},{status:503});
  const [caseResult,reports,jobs,actions,evidence,documents]=await Promise.all([
    db.from("cases").select("*").eq("id",id).single(),
    db.from("report_versions").select("*").eq("case_id",id).order("version_number",{ascending:false}).limit(1),
    db.from("research_jobs").select("id,category,status,confidence,error_message,started_at,completed_at").eq("case_id",id).order("started_at",{ascending:false}),
    db.from("action_requests").select("*").eq("case_id",id).order("created_at",{ascending:false}),
    db.from("evidence").select("*").eq("case_id",id).order("created_at",{ascending:false}),
    db.from("case_documents").select("*").eq("case_id",id).order("created_at",{ascending:false})
  ]);
  if(caseResult.error)return Response.json({ok:false,error:caseResult.error.message},{status:caseResult.error.code==="PGRST116"?404:500});
  for(const result of [reports,jobs,actions,evidence,documents])if(result.error)return Response.json({ok:false,error:result.error.message},{status:500});
  return Response.json({ok:true,case:caseResult.data,latestReport:reports.data?.[0]||null,jobs:jobs.data||[],actions:actions.data||[],evidence:evidence.data||[],documents:documents.data||[]});
}
