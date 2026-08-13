import { resolveMohaveParcel } from "../../lib/parcel-resolver";
import { resolveSpatialOverlays } from "../../lib/spatial-overlays";

export async function GET(request:Request){
  const apn=new URL(request.url).searchParams.get("apn")||"";const compact=apn.replace(/\D/g,"");
  if(compact.length!==8)return Response.json({ok:false,error:"Enter an eight-digit Mohave County APN."},{status:400});
  const parcel=await resolveMohaveParcel(apn);const overlays=parcel.status==="resolved"?await resolveSpatialOverlays(parcel):null;
  return Response.json({ok:parcel.status==="resolved",parcel,overlays},{status:parcel.status==="resolved"?200:404});
}
