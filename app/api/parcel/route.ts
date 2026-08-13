import { resolveMohaveParcel } from "../../lib/parcel-resolver";
import { resolveSpatialOverlays } from "../../lib/spatial-overlays";
import { resolveAdwrWells } from "../../lib/adwr-wells";
import { resolveUsdaSoils } from "../../lib/usda-soils";

export async function GET(request:Request){
  const apn=new URL(request.url).searchParams.get("apn")||"";const compact=apn.replace(/\D/g,"");
  if(compact.length!==8)return Response.json({ok:false,error:"Enter an eight-digit Mohave County APN."},{status:400});
  const parcel=await resolveMohaveParcel(apn);const [overlays,wells,soils]=parcel.status==="resolved"?await Promise.all([resolveSpatialOverlays(parcel),resolveAdwrWells(parcel),resolveUsdaSoils(parcel)]):[null,null,null];
  return Response.json({ok:parcel.status==="resolved",parcel,overlays,wells,soils},{status:parcel.status==="resolved"?200:404});
}
