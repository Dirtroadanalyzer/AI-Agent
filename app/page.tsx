"use client";

import { FormEvent, useState } from "react";

const researchAreas = ["Parcel identity", "Zoning & General Plan", "Access & right-of-way", "Flood & drainage", "Water & wells", "Septic & sewer", "Utilities & fire", "Permits & environmental", "Market & highest use", "Financial & negotiation", "Client report"];

export default function Home() {
  const [apn, setApn] = useState("306-02-195");
  const [objective, setObjective] = useState("");
  const [message, setMessage] = useState("Ready to create a preliminary analysis job.");

  async function start(event: FormEvent) {
    event.preventDefault();
    setMessage("Checking application configuration…");
    const response = await fetch("/api/health");
    const data = await response.json();
    setMessage(data.openaiConfigured ? `APN ${apn}: OpenAI connection is configured. Orchestrator tools are the next build.` : `APN ${apn}: application loaded, but OPENAI_API_KEY is not installed in Vercel yet.`);
  }

  return <main>
    <header><p>DIRT ROAD</p><h1>Property Analyzer & Transaction Coordinator</h1><span>Mohave County, Arizona</span></header>
    <section className="hero"><div><p className="kicker">ACQUISITION INTELLIGENCE</p><h2>Start a full-depth property analysis</h2><p>Each APN becomes a persistent research job that follows every available thread, records evidence, identifies blockers and ends in a client-ready report.</p></div>
      <form onSubmit={start}><label>Mohave County APN<input value={apn} onChange={e=>setApn(e.target.value)} placeholder="000-00-000" required /></label><label>Buyer objective or intended use<textarea value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Housing, RV park, storage, land split, investment…" /></label><button>Start preliminary analysis</button><small>{message}</small></form>
    </section>
    <section className="workflow"><div><p className="kicker">ORCHESTRATOR CHECKLIST</p><h2>Analysis does not stop after parcel identification</h2></div><div className="grid">{researchAreas.map((area,index)=><article key={area}><b>{String(index+1).padStart(2,"0")}</b><span>{area}</span><em>{index===0?"Connected next":"Queued for build"}</em></article>)}</div></section>
    <section className="notice"><strong>Professional-controlled workflow</strong><p>External messages, negotiation positions, objections, waivers and client delivery will require human approval. Public-source research and internal analysis will run automatically.</p></section>
  </main>;
}
