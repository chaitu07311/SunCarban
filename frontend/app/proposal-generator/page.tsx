"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { ProposalResponse, generateProposal } from "../../lib/api";

export default function ProposalGeneratorPage() {
  const [briefId, setBriefId] = useState("1");
  const [message, setMessage] = useState("");
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);

  async function handleGenerate() {
    try {
      const created = await generateProposal(Number(briefId));
      setProposal(created);
      setMessage(`Proposal generated: #${created.id}`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <SectionCard title="Proposal Generator">
      <ApiAuthBar role="sales_user" />
      <p className="text-slate-600">Run multi-agent generation on submitted brief.</p>
      <div className="mt-4 rounded bg-emerald-50 p-4 text-sm text-emerald-800">
        Agents: Analyzer -&gt; Retriever -&gt; Drafter + Governance checks
      </div>
      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm">Brief ID</label>
        <input
          type="number"
          value={briefId}
          onChange={(e) => setBriefId(e.target.value)}
          className="w-28 rounded border border-slate-300 px-2 py-1"
        />
        <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={handleGenerate}>
          Generate Proposal
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      {proposal ? (
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            <strong>ID:</strong> {proposal.id}
          </p>
          <p>
            <strong>Status:</strong> {proposal.status}
          </p>
          <p>
            <strong>Governance Flags:</strong> {proposal.governance_flags.join(", ") || "None"}
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}
