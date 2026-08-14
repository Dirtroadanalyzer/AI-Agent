import { resolveMohaveParcel } from "../../lib/parcel-resolver";
import { resolveSpatialOverlays } from "../../lib/spatial-overlays";
import { resolveAdwrWells } from "../../lib/adwr-wells";
import { resolveUsdaSoils } from "../../lib/usda-soils";
import { resolveRecorderLeads } from "../../lib/recorder-leads";
import { resolveMarketComps } from "../../lib/market-comps";
import { resolveBuildingDetails } from "../../lib/building-details";
import { resolveZoningRules } from "../../lib/zoning-rules";
import { resolveLandDivisionRules } from "../../lib/land-division-rules";
import { resolveHighestBestUse } from "../../lib/highest-best-use";
import { resolveValuationNegotiation } from "../../lib/valuation-negotiation";
export const maxDuration = 300;

export async function GET(request:Request){
  const apn=new URL(request.url).searchParams.get("apn")||"";const compact=apn.replace(/\D/g,"");
  if(compact.length!==8)return Response.json({ok:false,error:"Enter an eight-digit Mohave County APN."},{status:400});
  const parcel=await resolveMohaveParcel(apn);const parcelApn=String(parcel?.attributes?.PARCEL||parcel?.attributes?.TAXPIN||apn);const [overlays,wells,soils,market,buildings]=parcel.status==="resolved"?await Promise.all([resolveSpatialOverlays(parcel),resolveAdwrWells(parcel),resolveUsdaSoils(parcel),resolveMarketComps(parcel),resolveBuildingDetails([parcelApn])]):[null,null,null,null,null];const recorder=parcel.status==="resolved"&&overlays?await resolveRecorderLeads(parcel,overlays):null;const zoningRules=parcel.status==="resolved"&&overlays?resolveZoningRules(parcel,overlays):null;const landDivisionRules=parcel.status==="resolved"&&zoningRules?resolveLandDivisionRules(parcel,zoningRules):null;const highestBestUse=parcel.status==="resolved"?resolveHighestBestUse(parcel,buildings,overlays,zoningRules,landDivisionRules,wells,soils,market):null;const valuationNegotiation=parcel.status==="resolved"?resolveValuationNegotiation(parcel,market,highestBestUse):null;
  return Response.json({ok:parcel.status==="resolved",parcel,buildings,overlays,zoningRules,landDivisionRules,highestBestUse,valuationNegotiation,wells,soils,recorder,market},{status:parcel.status==="resolved"?200:404});
}
