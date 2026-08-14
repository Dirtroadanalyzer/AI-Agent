import { NextRequest, NextResponse } from "next/server";
import { resolveMohaveParcel } from "../../../lib/parcel-resolver";
import { resolveSpatialOverlays } from "../../../lib/spatial-overlays";

export const runtime="nodejs";
const xml=(value:unknown)=>String(value??"Not returned").replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]!));
const first=(result:any,id:string)=>result?.results?.find((x:any)=>x.id===id)?.features?.[0]||{};

export async function GET(request:NextRequest){
  const apn=request.nextUrl.searchParams.get("apn")||"";
  const type=request.nextUrl.searchParams.get("type")||"parcel";
  const parcel:any=await resolveMohaveParcel(apn);
  if(parcel.status!=="resolved")return NextResponse.json({error:"Parcel not resolved"},{status:404});
  const ring=parcel.geometry?.rings?.[0]||[];
  const xs=ring.map((p:number[])=>p[0]),ys=ring.map((p:number[])=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const spanX=Math.max(maxX-minX,.00001),spanY=Math.max(maxY-minY,.00001),scale=Math.min(690/spanX,650/spanY);
  const points=ring.map((p:number[])=>`${110+(p[0]-minX)*scale},${760-(p[1]-minY)*scale}`).join(" ");
  let title="Parcel boundary exhibit",accent="#a95334";
  const lines:string[]=[
    `APN: ${parcel.attributes?.PARCEL||apn}`,
    `Area: ${parcel.attributes?.PARCEL_SIZE||"—"} ${parcel.attributes?.UNIT_TYPE||"acres"}`,
    `Address: ${parcel.attributes?.SITE_ADDRESS||"No site address returned"}`,
    `Centroid: ${parcel.centroid?.latitude?.toFixed?.(6)}, ${parcel.centroid?.longitude?.toFixed?.(6)}`
  ];
  if(type==="zoning"||type==="flood"){
    const overlays:any=await resolveSpatialOverlays(parcel);
    if(type==="zoning"){
      title="Zoning and General Plan exhibit";accent="#b88a46";
      const zoning=first(overlays,"zoning"),plan=first(overlays,"general_plan");
      lines.splice(1,lines.length-1,
        `Zoning: ${zoning.zoning||zoning.rezone_to||"Not returned"}`,
        `Minimum-size label: ${zoning.min_size_label||"Not returned"}`,
        `General Plan: ${plan.LandUse||plan.LandUse_Abbr||"Not returned"}`);
    }else{
      title="FEMA flood-hazard exhibit";accent="#326b82";
      const flood=first(overlays,"fema_flood");
      lines.splice(1,lines.length-1,
        `Flood zone: ${flood.FLD_ZONE||"No intersecting feature returned"}`,
        `Zone subtype: ${flood.ZONE_SUBTY||"Not returned"}`,
        `Special Flood Hazard Area: ${flood.SFHA_TF||"Not returned"}`,
        `DFIRM panel: ${flood.DFIRM_ID||"Not returned"}`);
    }
  }
  const text=lines.map((line,i)=>`<text x="875" y="${245+i*64}" class="fact">${xml(line)}</text>`).join("");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
    <style>.title{font:700 42px Georgia,serif;fill:#17241d}.sub{font:600 20px Arial,sans-serif;fill:#5f6b64}.fact{font:600 24px Arial,sans-serif;fill:#17241d}.note{font:18px Arial,sans-serif;fill:#5f6b64}</style>
    <rect width="1600" height="1000" fill="#fffefa"/><rect x="42" y="42" width="1516" height="916" fill="none" stroke="#d8d8cf" stroke-width="3"/>
    <text x="85" y="115" class="title">${xml(title)}</text><text x="85" y="158" class="sub">Mohave County deterministic source diagram</text>
    <rect x="82" y="205" width="740" height="635" fill="#f2efe6" stroke="#d8d8cf" stroke-width="2"/>
    <polygon points="${points}" fill="${accent}" fill-opacity=".18" stroke="${accent}" stroke-width="8"/>
    <text x="760" y="260" class="title" font-size="32" transform="rotate(90 760 260)">N ↑</text>
    <text x="875" y="195" class="title" font-size="32">Verified source fields</text>${text}
    <line x1="875" y1="560" x2="1505" y2="560" stroke="#d8d8cf" stroke-width="2"/>
    <text x="875" y="615" class="note">Boundary shape normalized from the Mohave County GIS parcel polygon.</text>
    <text x="875" y="650" class="note">This legible diagram is not a survey and does not establish title, access,</text>
    <text x="875" y="682" class="note">setbacks, flood elevation, or legal boundary location.</text>
    <text x="85" y="910" class="note">Generated ${xml(new Date().toISOString())} · Open at full size for report-quality rendering.</text>
  </svg>`;
  return new NextResponse(svg,{headers:{"Content-Type":"image/svg+xml; charset=utf-8","Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}});
}
