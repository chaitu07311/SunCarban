"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { getCitations, getProposal } from "../../lib/api";

export default function ProposalViewerPage() {
  const [proposalId, setProposalId] = useState("1");
  const [content, setContent] = useState("");
  const [citations, setCitations] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState("");

  async function loadProposal() {
    try {
      const id = Number(proposalId);
      const proposal = await getProposal(id);
      const sourceList = await getCitations(id);
      setContent(proposal.content);
      setCitations(sourceList);
      setMessage(`Loaded proposal #${proposal.id}`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Proposal Viewer">
        <ApiAuthBar role="sales_user" />
        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            value={proposalId}
            onChange={(e) => setProposalId(e.target.value)}
            className="w-28 rounded border border-slate-300 px-2 py-1"
          />
          <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={loadProposal}>
            Load Proposal
          </button>
        </div>
        {message ? <p className="mb-2 text-sm text-slate-700">{message}</p> : null}
        <pre className="overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{content || "No proposal loaded."}</pre>
      </SectionCard>
      <SectionCard title="Source Citations">
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {citations.length === 0 ? <li>No citations loaded.</li> : null}
          {citations.map((row, index) => (
            <li key={`${index}-${String(row.document ?? row.section ?? "source")}`}>
              {String(row.document ?? "Source")} - {String(row.section ?? "Section")}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
