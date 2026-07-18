"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { ProposalResponse, getCitations, getProposal, listProposals } from "../../lib/api";

export default function ProposalViewerPage() {
  const [proposalId, setProposalId] = useState("1");
  const [content, setContent] = useState("");
  const [citations, setCitations] = useState<Array<Record<string, unknown>>>([]);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [recentProposals, setRecentProposals] = useState<ProposalResponse[]>([]);
  const [message, setMessage] = useState("");

  async function loadProposal() {
    try {
      const id = Number(proposalId);
      const proposal = await getProposal(id);
      const sourceList = await getCitations(id);
      setContent(proposal.content);
      setProposal(proposal);
      setCitations(sourceList);
      setMessage(`Loaded proposal #${proposal.id}`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadRecentProposals() {
    try {
      const rows = await listProposals();
      setRecentProposals(rows.slice(0, 8));
      setMessage(`Loaded ${Math.min(rows.length, 8)} recent proposal(s).`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function selectProposal(row: ProposalResponse) {
    setProposalId(String(row.id));
    try {
      const proposalDetail = await getProposal(row.id);
      const sourceList = await getCitations(row.id);
      setProposal(proposalDetail);
      setContent(proposalDetail.content);
      setCitations(sourceList);
      setMessage(`Loaded proposal #${proposalDetail.id}`);
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
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-white" onClick={loadRecentProposals}>
            Load Recent
          </button>
        </div>
        {message ? <p className="mb-2 text-sm text-slate-700">{message}</p> : null}
        {proposal ? (
          <div className="mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              <strong>Trace ID:</strong> {proposal.trace_id || "Not available"}
            </p>
            <p>
              <strong>Selected Model:</strong> {String(proposal.model_route?.selected_model ?? "Unknown")}
            </p>
          </div>
        ) : null}
        <pre className="overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{content || "No proposal loaded."}</pre>
      </SectionCard>
      <SectionCard title="Recent Proposals">
        <div className="space-y-2 text-sm">
          {recentProposals.length === 0 ? <p className="text-slate-600">No proposals loaded.</p> : null}
          {recentProposals.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => selectProposal(row)}
              className="block w-full rounded border border-slate-200 bg-slate-50 p-3 text-left text-slate-700"
            >
              <p>
                <strong>Proposal #{row.id}</strong> for brief #{row.brief_id}
              </p>
              <p>Status: {row.status}</p>
              <p>Trace: {row.trace_id || "Not available"}</p>
              <p>Model: {String(row.model_route?.selected_model ?? "Unknown")}</p>
            </button>
          ))}
        </div>
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
