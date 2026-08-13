"use client";

import { FormEvent, useMemo, useState } from "react";

const researchAreas = ["Parcel identity", "Zoning & General Plan", "Access & right-of-way", "Flood & drainage", "Water & wells", "Septic & sewer", "Utilities & fire", "Permits & environmental", "Market & highest use", "Financial & negotiation", "Client report"];
type AnalysisResult = { ok: boolean; apn?: string; report?: string; generatedAt?: string; error?: string };

export default function Home() {
  const [apn, setApn] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState("Ready for a new Mohave County parcel.");
  const [report, setReport] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [running, setRunning] = useState(false);
  const validApn = useMemo(() => apn.trim().replace(/[^0-9]/g, "").length === 8, [apn]);

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!validApn) { setStatus("Enter an eight-digit Mohave County APN, such as 306-02-195."); return; }
    setRunning(true); setReport("");
    setStatus("Researching public sources and preparing the preliminary report. This can take up to a minute…");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apn, objective }) });
      const data: AnalysisResult = await response.json();
      if (!response.ok || !data.ok || !data.report) throw new Error(data.error || "The analysis could not be completed.");
      setReport(data.report); setGeneratedAt(data.generatedAt || new Date().toISOString());
      setStatus(`Preliminary report completed for APN ${data.apn}. Review source limitations before client delivery.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "The analysis could not be completed."); }
    finally { setRunning(false); }
  }

  function downloadReport() {
    const contents = `DIRT ROAD PROPERTY ANALYZER\nMohave County, Arizona\nGenerated: ${generatedAt}\n\n${report}`;
    const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `Dirt-Road-APN-${apn.trim().replace(/[^0-9]/g, "-")}.txt`; link.click(); URL.revokeObjectURL(url);
  }

  return <main>
    <header><p>DIRT ROAD</p><h1>Property Analyzer & Transaction Coordinator</h1><span>Mohave County, Arizona</span></header>
    <section className="hero"><div><p className="kicker">ACQUISITION INTELLIGENCE</p><h2>Start a full-depth property analysis</h2><p>The analyzer researches available public web sources, separates verified facts from conclusions, flags missing due-diligence items and produces a preliminary acquisition report.</p><div className="truth"><strong>Current capability</strong><span>Live AI research and preliminary analysis. Direct county GIS/API connectors, document storage and transaction automation remain under development.</span></div></div>
      <form onSubmit={start}><label>Mohave County APN<input value={apn} onChange={e=>setApn(e.target.value)} placeholder="306-02-195" required disabled={running} /></label><label>Buyer objective or intended use<textarea value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Tiny-home community, off-grid residence, land split, investment…" disabled={running} /></label><button disabled={running}>{running ? "Research in progress…" : "Run preliminary analysis"}</button><small role="status">{status}</small></form>
    </section>
    {report && <section className="report"><div className="reportHead"><div><p className="kicker">PRELIMINARY CLIENT REPORT</p><h2>APN {apn}</h2><small>Generated {new Date(generatedAt).toLocaleString()}</small></div><button type="button" onClick={downloadReport}>Download report</button></div><pre>{report}</pre><div className="disclaimer"><strong>Required professional review</strong><p>This preliminary report is decision support, not a title report, survey, legal opinion, engineering conclusion, appraisal, zoning clearance, septic approval or guarantee of source accuracy. Verify material findings with the governing agency and qualified professionals during the contractual due-diligence period.</p></div></section>}
    <section className="workflow"><div><p className="kicker">FULL-DEPTH PROTOCOL</p><h2>Analysis does not stop after parcel identification</h2></div><div className="grid">{researchAreas.map((area,index)=><article key={area}><b>{String(index+1).padStart(2,"0")}</b><span>{area}</span><em>{index < 9 ? "Preliminary AI research" : "Decision support"}</em></article>)}</div></section>
    <section className="notice"><strong>Professional-controlled workflow</strong><p>External messages, negotiation positions, objections, waivers and client delivery require human approval. Public-source research and internal analysis may run automatically.</p></section>
  </main>;
}
