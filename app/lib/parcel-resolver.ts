const PARCEL_SERVICE="https://mcgis.mohave.gov/arcgis/rest/services/PARCELS/MapServer";
const CANDIDATE_LAYERS=[14,3,2];
const CANDIDATE_FIELDS=["PARCEL","TPARCEL","TAXPIN"];

type Diagnostic={layer:number;field?:string;value?:string;result:string;detail?:string};
async function fetchJson(url:string,timeout=20000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json()}finally{clearTimeout(timer)}}
function digits(value:unknown){return String(value||"").replace(/\D/g,"")}
function escapeSql(value:string){return value.replaceAll("'","''")}

export async function resolveMohaveParcel(apn:string){
  const compact=digits(apn);const formatted=`${compact.slice(0,3)}-${compact.slice(3,5)}-${compact.slice(5)}`;const diagnostics:Diagnostic[]=[];
  for(const layer of CANDIDATE_LAYERS){
    let metadata:any;try{metadata=await fetchJson(`${PARCEL_SERVICE}/${layer}?f=json`)}catch(error){diagnostics.push({layer,result:"metadata_failed",detail:error instanceof Error?error.message:"Unknown error"});continue}
    const available=new Set((metadata.fields||[]).map((x:any)=>String(x.name).toUpperCase()));
    for(const field of CANDIDATE_FIELDS.filter(x=>available.has(x))){
      const values=field==="TPARCEL"?[compact,formatted]:[formatted,compact];
      for(const value of values){
        const params=new URLSearchParams({where:`${field}='${escapeSql(value)}'`,outFields:"*",returnGeometry:"true",outSR:"4326",f:"json"});
        try{const data=await fetchJson(`${PARCEL_SERVICE}/${layer}/query?${params}`);const features=data.features||[];diagnostics.push({layer,field,value,result:features.length?`matched_${features.length}`:"no_match"});const exact=features.find((x:any)=>[x.attributes?.PARCEL,x.attributes?.TPARCEL,x.attributes?.TAXPIN].some(v=>digits(v)===compact));if(exact?.geometry){const a=exact.attributes||{};return {status:"resolved",matchQuality:"exact_apn",service:PARCEL_SERVICE,layer,layerName:metadata.name,matchedField:field,queriedValue:value,attributes:a,geometry:exact.geometry,spatialReference:data.spatialReference||{wkid:4326},centroid:{latitude:Number(a.LATITUDE)||null,longitude:Number(a.LONGITUDE)||null},diagnostics}}
        }catch(error){diagnostics.push({layer,field,value,result:"query_failed",detail:error instanceof Error?error.message:"Unknown error"})}
      }
    }
  }
  return {status:"unresolved",matchQuality:"none",service:PARCEL_SERVICE,geometry:null,attributes:null,centroid:null,diagnostics};
}
