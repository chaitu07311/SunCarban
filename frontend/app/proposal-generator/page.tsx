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
        <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-slate-50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2">Proposal ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Trace ID</th>
                <th className="px-3 py-2">Selected Model</th>
                <th className="px-3 py-2">Governance Flags</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-3 py-2">{proposal.id}</td>
                <td className="px-3 py-2">{proposal.status}</td>
                <td className="px-3 py-2">{proposal.trace_id || "Not available"}</td>
                <td className="px-3 py-2">{String(proposal.model_route?.selected_model ?? "Unknown")}</td>
                <td className="px-3 py-2">{proposal.governance_flags.join(", ") || "None"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}
