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
  const results=[];for(const spec of overlays)results.push(await postQuery(spec,parcel.geometry));
  return {status:"queried",spatialReference:4326,results};
}
