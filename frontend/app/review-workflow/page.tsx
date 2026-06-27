"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { ReviewResponse, listReviews, submitReview } from "../../lib/api";

export default function ReviewWorkflowPage() {
  const [proposalId, setProposalId] = useState("1");
  const [comments, setComments] = useState("Looks good");
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);

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

  return (
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
      <div className="mt-4 flex gap-2">
        <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={() => doReview("approved")}>
          Approve
        </button>
        <button type="button" className="rounded bg-rose-700 px-4 py-2 text-white" onClick={() => doReview("rejected")}>
          Reject
        </button>
        <button type="button" className="rounded bg-slate-700 px-4 py-2 text-white" onClick={loadReviews}>
          Load Reviews
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
      <ul className="mt-3 space-y-2 text-sm">
        {reviews.map((row) => (
          <li key={row.id} className="rounded border border-slate-200 bg-slate-50 p-2">
            #{row.id} - {row.decision} - {row.comments}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
