type OverlaySpec={id:string;title:string;url:string;fields:string};
const overlays:OverlaySpec[]=[
  {id:"zoning",title:"Mohave County zoning",url:"https://mcgis.mohave.gov/arcgis/rest/services/PZ_GeneralPlanNewStyle/MapServer/19/query",fields:"*"},
  {id:"general_plan",title:"Mohave County General Plan",url:"https://mcgis.mohave.gov/arcgis/rest/services/PZ_GeneralPlanNewStyle/MapServer/2/query",fields:"*"},
  {id:"right_of_way",title:"Mohave County right-of-way",url:"https://mcgis.mohave.gov/arcgis/rest/services/RightOfWay/MapServer/0/query",fields:"*"},
  {id:"county_roads",title:"County-maintained roads",url:"https://mcgis.mohave.gov/arcgis/rest/services/ROADS/MapServer/7/query",fields:"*"},
  {id:"road_network",title:"Road network",url:"https://mcgis.mohave.gov/arcgis/rest/services/ROADS/MapServer/14/query",fields:"*"},
  {id:"fema_flood",title:"FEMA NFHL flood hazard",url:"https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query",fields:"FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DFIRM_ID"}
];

async function postQuery(spec:OverlaySpec,geometry:unknown){
  const params=new URLSearchParams({geometry:JSON.stringify(geometry),geometryType:"esriGeometryPolygon",inSR:"4326",spatialRel:"esriSpatialRelIntersects",outFields:spec.fields,returnGeometry:"false",resultRecordCount:"25",f:"json"});
  let last="Unknown service error";
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
    try{const response=await fetch(spec.url,{method:"POST",signal:controller.signal,headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:params.toString(),cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(data.error)throw new Error(data.error.message||"ArcGIS error");return {id:spec.id,title:spec.title,status:"queried",source:spec.url,featureCount:(data.features||[]).length,features:(data.features||[]).map((x:any)=>x.attributes||{})}}
    catch(error){last=error instanceof Error?error.message:"Unknown error";if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*700))}finally{clearTimeout(timer)}
  }
  return {id:spec.id,title:spec.title,status:"temporarily_unavailable",source:spec.url,featureCount:0,features:[],error:last};
}

export async function resolveSpatialOverlays(parcel:any){
  if(!parcel?.geometry)return {status:"blocked",reason:"Validated parcel geometry is required.",results:[]};
  const results:any[]=[];for(const spec of overlays)results.push(await postQuery(spec,parcel.geometry));
  const apn=String(parcel.attributes?.PARCEL||parcel.attributes?.TAXPIN||"").replace(/\D/g,"");
  for(const result of results){if(result.id==="zoning"||result.id==="general_plan"){result.exactParcelFeatures=result.features.filter((x:any)=>String(x.TAXPIN||"").replace(/\D/g,"")===apn);result.adjacentOrBoundaryFeatures=result.features.filter((x:any)=>String(x.TAXPIN||"").replace(/\D/g,"")!==apn)}}
  const zoning=results.find(x=>x.id==="zoning")?.exactParcelFeatures?.[0];const plan=results.find(x=>x.id==="general_plan")?.exactParcelFeatures?.[0];const row=results.find(x=>x.id==="right_of_way");const maintained=results.find(x=>x.id==="county_roads");const roads=results.find(x=>x.id==="road_network");const flood=results.find(x=>x.id==="fema_flood");
  const activeRow=(row?.features||[]).filter((x:any)=>!String(x.Type||x.Dedication||"").toLowerCase().includes("abandon"));const abandonedRow=(row?.features||[]).filter((x:any)=>String(x.Type||x.Dedication||"").toLowerCase().includes("abandon"));
  const conclusions=[
    zoning?{topic:"zoning",status:"parcel_matched",statement:`Parcel zoning is ${zoning.zoning||zoning.rezone_to||"returned by county layer"}; minimum-size label ${zoning.min_size_label||"not stated"}.`,evidence:zoning}:null,
    plan?{topic:"general_plan",status:"parcel_matched",statement:`General Plan designation is ${plan.LandUse||plan.LandUse_Abbr||"returned by county layer"}.`,evidence:plan}:null,
    activeRow.length?{topic:"right_of_way",status:"intersects",statement:`${activeRow.length} active roadway/right-of-way feature(s) intersect the parcel polygon.`,evidence:activeRow}:null,
    abandonedRow.length?{topic:"right_of_way_abandonment",status:"intersects_review_required",statement:`${abandonedRow.length} abandonment feature(s) also intersect; compare their instruments and geometry against active access before concluding legal effect.`,evidence:abandonedRow}:null,
    {topic:"county_maintenance",status:maintained?.featureCount?"intersects":"not_mapped_as_maintained",statement:maintained?.featureCount?`${maintained.featureCount} county-maintained road feature(s) intersect the parcel.`:"No county-maintained-road feature intersects the parcel; this does not negate physical or legal access."},
    roads?.featureCount?{topic:"road_adjacency",status:"intersects",statement:`Road network intersects the parcel at ${(roads.features||[]).map((x:any)=>x.FNM||x.ONM).filter(Boolean).join(" and ")}.`,evidence:roads.features}:null,
    flood?.featureCount?{topic:"flood",status:"parcel_intersection",statement:`FEMA intersection returned ${(flood.features||[]).map((x:any)=>`${x.FLD_ZONE}${x.ZONE_SUBTY?` — ${x.ZONE_SUBTY}`:""}`).join("; ")}.`,evidence:flood.features}:null
  ].filter(Boolean);
  return {status:"queried",spatialReference:4326,conclusions,results};
}
