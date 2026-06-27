"use client";

import { useState } from "react";

import { ApiAuthBar } from "../components/ApiAuthBar";
import { SectionCard } from "../components/SectionCard";
import { listBriefs, listProposals } from "../lib/api";

export default function DashboardPage() {
  const [briefCount, setBriefCount] = useState(0);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [message, setMessage] = useState("Use API Auth and click Refresh Metrics.");

  async function loadMetrics() {
    try {
      const briefs = await listBriefs();
      const proposals = await listProposals();
      setBriefCount(briefs.length);
      setPendingReviewCount(proposals.filter((p) => p.status === "pending_review").length);
      setMessage("Metrics refreshed from backend API.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-emerald-900">Dashboard</h2>
      <ApiAuthBar role="sales_user" />
      <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={loadMetrics}>
        Refresh Metrics
      </button>
      <p className="text-sm text-slate-700">{message}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Active Briefs">
          <p className="text-3xl font-semibold">{briefCount}</p>
          <p className="text-sm text-slate-600">Total briefs in system</p>
        </SectionCard>
        <SectionCard title="Pending Reviews">
          <p className="text-3xl font-semibold">{pendingReviewCount}</p>
          <p className="text-sm text-slate-600">Proposals awaiting reviewer action</p>
        </SectionCard>
        <SectionCard title="Average TAT">
          <p className="text-3xl font-semibold">&lt; 5 min</p>
          <p className="text-sm text-slate-600">Target SLA for proposal generation</p>
        </SectionCard>
      </div>
    </div>
  );
}
