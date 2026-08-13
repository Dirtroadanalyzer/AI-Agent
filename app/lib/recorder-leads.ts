const RECORDER_PORTAL="https://eaglerss.mohave.gov/web/user/disclaimer";
const SURVEY_SEARCH="https://appsweb.mohave.gov/data_apps/maps/record_of_survey";

type RecorderLead={
  id:string;
  reference:string;
  referenceType:"fee_number"|"record_of_survey"|"board_resolution";
  role:string;
  source:string;
  sourceUrl:string;
  date?:number|null;
  relatedRoad?:string|null;
  retrieval:"automated_link"|"recorder_checkpoint";
};

function compact(value:unknown){return String(value||"").replace(/[^A-Za-z0-9]/g,"").toUpperCase()}
function normalizeSurvey(value:unknown){const match=String(value||"").match(/RS[_\s-]*(\d{1,3})\/(\d{1,3})/i);return match?`${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`:null}
function devalueDecode(serialized:string){
  const values=JSON.parse(serialized);const cache=new Map<number,unknown>();
  const decode=(index:number):any=>{if(cache.has(index))return cache.get(index);const value=values[index];if(value===null||typeof value!=="object")return value;if(Array.isArray(value)){const result:any[]=[];cache.set(index,result);for(const child of value)result.push(typeof child==="number"?decode(child):child);return result}const result:Record<string,unknown>={};cache.set(index,result);for(const [key,child] of Object.entries(value))result[key]=typeof child==="number"?decode(child):child;return result};
  return decode(0);
}

async function searchSurvey(bookPage:string){
  const action=`${SURVEY_SEARCH}?/search`;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),28000);
  try{
    const response=await fetch(action,{method:"POST",signal:controller.signal,headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded","x-sveltekit-action":"true",Origin:"https://appsweb.mohave.gov",Referer:SURVEY_SEARCH,"User-Agent":"Dirt-Road-Property-Analyzer/1.0"},body:new URLSearchParams({book:bookPage}).toString(),cache:"no-store"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);const envelope=await response.json();if(envelope.type!=="success"||!envelope.data)throw new Error("Survey search did not return a result envelope");const decoded=devalueDecode(envelope.data);const results=Array.isArray(decoded?.results)?decoded.results:[];
    return {bookPage,status:results.length?"documents_found":"no_documents_found",documents:results.map((item:any)=>({description:item.description,pdfUrl:`https://appsweb.mohave.gov/data_apps/maps/download/${item.url}/pdf`,tiffUrl:item.TIFFLink?`https://appsweb.mohave.gov/data_apps/maps/download/${item.url}/tif`:null}))};
  }catch(error){return {bookPage,status:"temporarily_unavailable",documents:[],error:error instanceof Error?error.message:"Survey lookup failed"}}finally{clearTimeout(timer)}
}

export async function resolveRecorderLeads(parcel:any,overlays:any){
  const leads:RecorderLead[]=[];const seen=new Set<string>();
  const add=(lead:RecorderLead)=>{const key=`${lead.referenceType}:${compact(lead.reference)}`;if(!compact(lead.reference)||seen.has(key))return;seen.add(key);leads.push(lead)};
  const receipt=parcel?.attributes?.RECPTNO;if(receipt)add({id:`fee-${compact(receipt)}`,reference:String(receipt),referenceType:"fee_number",role:`Assessor-indexed ${parcel?.attributes?.DEEDTYPE||"deed"} / last transfer lead`,source:"Mohave County parcel attributes",sourceUrl:"https://mcgis.mohave.gov/arcgis/rest/services/PARCELS/MapServer/14",date:parcel?.attributes?.SALEDT||null,retrieval:"recorder_checkpoint"});
  const legalSurvey=String(parcel?.attributes?.LEGAL_DESCRIPTION||"").match(/RS\s+BK\s+(\d+)\s+PG\s+(\d+)/i);if(legalSurvey){const bookPage=`${legalSurvey[1].padStart(2,"0")}-${legalSurvey[2].padStart(2,"0")}`;add({id:`survey-${bookPage}`,reference:bookPage,referenceType:"record_of_survey",role:"Record of Survey cited in parcel legal description",source:"Mohave County parcel legal description",sourceUrl:`${SURVEY_SEARCH}?value=${bookPage}`,retrieval:"automated_link"})}
  const rowResult=overlays?.results?.find((x:any)=>x.id==="right_of_way");for(const feature of rowResult?.features||[]){
    const survey=normalizeSurvey(feature.Instrument||feature.DOC);if(survey)add({id:`survey-${survey}`,reference:survey,referenceType:"record_of_survey",role:`Survey supporting ${feature.Type||"right-of-way"}${feature.Name?` — ${feature.Name}`:""}`,source:"Mohave County right-of-way GIS",sourceUrl:feature.URL||`${SURVEY_SEARCH}?value=${survey}`,date:feature.RecDate||null,relatedRoad:feature.Name||null,retrieval:"automated_link"});
    if(feature.FeeNumber)add({id:`fee-${compact(feature.FeeNumber)}`,reference:String(feature.FeeNumber),referenceType:"fee_number",role:`Recorded ${feature.Type||feature.Dedication||"right-of-way"}${feature.Name?` — ${feature.Name}`:""}`,source:"Mohave County right-of-way GIS",sourceUrl:RECORDER_PORTAL,date:feature.RecDate||null,relatedRoad:feature.Name||null,retrieval:"recorder_checkpoint"});
    if(String(feature.Instrument||"").toLowerCase().includes("bos reso"))add({id:`resolution-${compact(feature.Instrument)}`,reference:String(feature.Instrument),referenceType:"board_resolution",role:`Board resolution supporting ${feature.Type||"road action"}${feature.Name?` — ${feature.Name}`:""}`,source:"Mohave County right-of-way GIS",sourceUrl:feature.URL||"https://lfp.mohave.gov/bos/",date:feature.RecDate||null,relatedRoad:feature.Name||null,retrieval:"automated_link"});
  }
  const roadResult=overlays?.results?.find((x:any)=>x.id==="road_network");for(const feature of roadResult?.features||[]){const survey=normalizeSurvey(feature.DOC);if(survey)add({id:`survey-${survey}`,reference:survey,referenceType:"record_of_survey",role:`Survey referenced by road network — ${feature.FNM||feature.ONM||"unnamed road"}`,source:"Mohave County road GIS",sourceUrl:`${SURVEY_SEARCH}?value=${survey}`,relatedRoad:feature.FNM||feature.ONM||null,retrieval:"automated_link"});if(feature.REF)add({id:`fee-${compact(feature.REF)}`,reference:String(feature.REF),referenceType:"fee_number",role:`Recorded road reference — ${feature.FNM||feature.ONM||"unnamed road"}`,source:"Mohave County road GIS",sourceUrl:RECORDER_PORTAL,relatedRoad:feature.FNM||feature.ONM||null,retrieval:"recorder_checkpoint"})}
  const surveyRefs=leads.filter(x=>x.referenceType==="record_of_survey").map(x=>x.reference);const surveys=await Promise.all(surveyRefs.map(searchSurvey));const gated=leads.filter(x=>x.retrieval==="recorder_checkpoint");
  return {status:gated.length?"partial_human_checkpoint":"automated",sourceSystems:["Mohave County Assessor parcel GIS","Mohave County right-of-way and road GIS","Mohave County Record of Survey map service","Mohave County Recorder EagleWeb"],leads,surveys,humanCheckpoint:gated.length?{required:true,reason:"Mohave County Recorder requires its terms acceptance and Google reCAPTCHA before document-image searches. The agent may prepare exact searches but must not bypass that control.",url:RECORDER_PORTAL,steps:["Open the official Recorder portal link.","Complete reCAPTCHA and click Accept.",`Search each prepared fee number: ${gated.map(x=>x.reference).join(", ")}.`,"Open the matching instrument, confirm the parties/legal description, and download the deed or easement PDF.","Upload the PDFs to the case so the agent can extract, compare, cite and preserve them."],requestedReturn:"PDF images and index details for each matching fee number"}:null,conclusions:[`${leads.length} recorder/document lead(s) were derived from parcel-matched county data.`,`${surveys.reduce((sum:any,x:any)=>sum+x.documents.length,0)} Record of Survey document link(s) were retrieved automatically.`,gated.length?`${gated.length} fee-number search(es) are prepared for the single CAPTCHA-gated Recorder checkpoint.`:"No Recorder checkpoint is currently required.","These leads are document retrieval evidence, not a complete title examination or legal opinion."]};
}
