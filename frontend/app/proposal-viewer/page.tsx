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
          <div className="mb-3 overflow-x-auto rounded border border-slate-200 bg-slate-50">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Proposal ID</th>
                  <th className="px-3 py-2">Brief ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Trace ID</th>
                  <th className="px-3 py-2">Selected Model</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-3 py-2">{proposal.id}</td>
                  <td className="px-3 py-2">{proposal.brief_id}</td>
                  <td className="px-3 py-2">{proposal.status}</td>
                  <td className="px-3 py-2">{proposal.trace_id || "Not available"}</td>
                  <td className="px-3 py-2">{String(proposal.model_route?.selected_model ?? "Unknown")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {!proposal ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={2}>No proposal loaded.</td>
                </tr>
              ) : (
                Object.entries(proposal).map(([key, value]) => (
                  <tr key={key} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-medium">{key}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap break-words">
                      {value === null || value === undefined
                        ? "-"
                        : typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                    </td>
                  </tr>
                ))
              )}
              {proposal ? (
                <tr className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-medium">content_preview</td>
                  <td className="px-3 py-2 whitespace-pre-wrap break-words">{content || "-"}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Recent Proposals">
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Proposal ID</th>
                <th className="px-3 py-2">Brief ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Trace</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentProposals.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>No proposals loaded.</td>
                </tr>
              ) : null}
              {recentProposals.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.id}</td>
                  <td className="px-3 py-2">{row.brief_id}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.trace_id || "Not available"}</td>
                  <td className="px-3 py-2">{String(row.model_route?.selected_model ?? "Unknown")}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => selectProposal(row)}
                      className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                    >
                      Load
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Source Citations">
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Section</th>
              </tr>
            </thead>
            <tbody>
              {citations.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={2}>No citations loaded.</td>
                </tr>
              ) : null}
              {citations.map((row, index) => (
                <tr key={`${index}-${String(row.document ?? row.section ?? "source")}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">{String(row.document ?? "Source")}</td>
                  <td className="px-3 py-2">{String(row.section ?? "Section")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
