"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { ProposalResponse, ReviewResponse, listProposals, listReviews, submitReview } from "../../lib/api";

export default function ReviewWorkflowPage() {
  const [proposalId, setProposalId] = useState("1");
  const [comments, setComments] = useState("Looks good");
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [recentProposals, setRecentProposals] = useState<ProposalResponse[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalResponse | null>(null);

  async function doReview(decision: "approved" | "rejected") {
    try {
      const result = await submitReview(Number(proposalId), decision, comments);
      setMessage(`Review submitted. Proposal status: ${result.proposal_status}`);
      const rows = await listReviews(Number(proposalId));
      setReviews(rows);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadReviews() {
    try {
      const rows = await listReviews(Number(proposalId));
      setReviews(rows);
      setMessage(`Loaded ${rows.length} review(s).`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadRecentProposals() {
    try {
      const rows = await listProposals();
      const recent = rows.slice(0, 8);
      setRecentProposals(recent);
      setSelectedProposal(recent[0] ?? null);
      if (recent[0]) {
        setProposalId(String(recent[0].id));
      }
      setMessage(`Loaded ${recent.length} recent proposal(s).`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  function selectProposal(proposal: ProposalResponse) {
    setSelectedProposal(proposal);
    setProposalId(String(proposal.id));
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Review Workflow">
        <ApiAuthBar role="reviewer" />
        <div className="space-y-3 text-sm">
          <p>
            <strong>Checklist:</strong> Validate dosage, verify assumptions, approve/reject.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">Proposal ID</label>
          <input
            type="number"
            value={proposalId}
            onChange={(e) => setProposalId(e.target.value)}
            className="w-28 rounded border border-slate-300 px-2 py-1"
          />
          <input
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="min-w-64 rounded border border-slate-300 px-2 py-1"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={() => doReview("approved")}>
            Approve
          </button>
          <button type="button" className="rounded bg-rose-700 px-4 py-2 text-white" onClick={() => doReview("rejected")}>
            Reject
          </button>
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-white" onClick={loadReviews}>
            Load Reviews
          </button>
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-white" onClick={loadRecentProposals}>
            Load Recent Proposals
          </button>
        </div>
        {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
        {selectedProposal ? (
          <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-slate-50">
            <table className="w-full text-left text-sm text-slate-700">
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
                  <td className="px-3 py-2">{selectedProposal.id}</td>
                  <td className="px-3 py-2">{selectedProposal.status}</td>
                  <td className="px-3 py-2">{selectedProposal.trace_id || "Not available"}</td>
                  <td className="px-3 py-2">{String(selectedProposal.model_route?.selected_model ?? "Unknown")}</td>
                  <td className="px-3 py-2">{selectedProposal.governance_flags.join(", ") || "None"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-3 overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Review ID</th>
                <th className="px-3 py-2">Proposal ID</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Comments</th>
                <th className="px-3 py-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>No reviews loaded.</td>
                </tr>
              ) : null}
              {reviews.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.id}</td>
                  <td className="px-3 py-2">{row.proposal_id}</td>
                  <td className="px-3 py-2">{row.decision}</td>
                  <td className="px-3 py-2">{row.comments}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Recent Proposals For Review">
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Proposal ID</th>
                <th className="px-3 py-2">Brief ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Trace</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentProposals.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>No proposals loaded.</td>
                </tr>
              ) : null}
              {recentProposals.map((proposal) => (
                <tr key={proposal.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{proposal.id}</td>
                  <td className="px-3 py-2">{proposal.brief_id}</td>
                  <td className="px-3 py-2">{proposal.status}</td>
                  <td className="px-3 py-2">{String(proposal.model_route?.selected_model ?? "Unknown")}</td>
                  <td className="px-3 py-2">{proposal.trace_id || "Not available"}</td>
                  <td className="px-3 py-2">
                    <button
                      key={`select-${proposal.id}`}
                      type="button"
                      onClick={() => selectProposal(proposal)}
                      className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
