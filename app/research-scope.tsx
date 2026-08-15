"use client";
export const researchOptions=[
  ["parcel","Property identity"],["title","Recorder and title depth"],["zoning","Zoning and ordinances"],["access","Access and right-of-way"],["flood","Flood screening"],["water","Wells and water"],["septic","Septic and soils"],["utilities","Utilities"],["fire","Fire service and code"],["environment","Environmental"],["market","Comparable value"],["negotiation","Negotiation strategy"]
] as const;
export const purposeOptions=["Purchase inquiry","Listing prospect","Quick property screen","Development feasibility","Active transaction","Custom analysis"] as const;
const baseline=["parcel","zoning","access","flood","market"];
export function presetForPurpose(purpose:string){
  if(purpose==="Quick property screen")return baseline;
  if(purpose==="Purchase inquiry")return [...baseline,"title","water","septic","utilities","fire","negotiation"];
  if(purpose==="Listing prospect")return [...baseline,"title","water","septic","utilities","fire"];
  if(purpose==="Development feasibility")return researchOptions.map(x=>x[0]);
  if(purpose==="Active transaction")return [...baseline,"title","water","septic","utilities","fire","environment","negotiation"];
  return baseline;
}
export function ResearchScopeSelector({purpose,modules,onPurpose,onModules}:{purpose:string;modules:string[];onPurpose:(value:string)=>void;onModules:(value:string[])=>void}){
  return <div className="researchScope"><label>Working purpose<select value={purpose} onChange={e=>{const value=e.target.value;onPurpose(value);onModules(presetForPurpose(value))}}>{purposeOptions.map(x=><option key={x}>{x}</option>)}</select><small>Purpose recommends a starting scope. You remain in control.</small></label><fieldset><legend>Research modules</legend><div className="moduleChecks">{researchOptions.map(([id,label])=><label className="check" key={id}><input type="checkbox" checked={modules.includes(id)} disabled={["parcel","zoning","access","flood","market"].includes(id)} onChange={e=>onModules(e.target.checked?[...modules,id]:modules.filter(x=>x!==id))}/><span>{label}{["parcel","zoning","access","flood","market"].includes(id)?" · baseline":""}</span></label>)}</div><small>Baseline identity, zoning, access, flood and value screening cannot be removed.</small></fieldset></div>
}
