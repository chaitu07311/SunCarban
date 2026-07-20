"use client";

import { useState } from "react";

import { ApiAuthBar } from "../components/ApiAuthBar";
import { SectionCard } from "../components/SectionCard";
import { listBriefs, listProposals } from "../lib/api";

const DEV_ACCOUNTS = [
  {
    role: "sales_user",
    label: "Sales Team",
    email: "sales@suncarban.local",
    password: "sales123",
    access: "Create briefs and generate proposals",
  },
  {
    role: "reviewer",
    label: "Reviewer",
    email: "reviewer@suncarban.local",
    password: "reviewer123",
    access: "Review proposals and view audit logs",
  },
  {
    role: "admin",
    label: "Admin",
    email: "admin@suncarban.local",
    password: "admin123",
    access: "Full workflow access and governance views",
  },
];

export default function DashboardPage() {
  const [briefCount, setBriefCount] = useState(0);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [strongRouteCount, setStrongRouteCount] = useState(0);
  const [latestTraceId, setLatestTraceId] = useState("");
  const [message, setMessage] = useState("Use API Auth and click Refresh Metrics.");

  async function loadMetrics() {
    try {
      const briefs = await listBriefs();
      const proposals = await listProposals();
      setBriefCount(briefs.length);
      setPendingReviewCount(proposals.filter((p) => p.status === "pending_review").length);
      setStrongRouteCount(
        proposals.filter((proposal) => proposal.model_route?.selected_model === "deterministic-strong").length,
      );
      setLatestTraceId(proposals[0]?.trace_id ?? "");
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
      <SectionCard title="Loaded Metrics (Table)">
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">Active Briefs</td>
                <td className="px-3 py-2">{briefCount}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">Pending Reviews</td>
                <td className="px-3 py-2">{pendingReviewCount}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">Strong Route Runs</td>
                <td className="px-3 py-2">{strongRouteCount}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">Latest Trace ID</td>
                <td className="px-3 py-2">{latestTraceId || "Not loaded"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Workflow Test Accounts">
        <p className="mb-4 text-sm text-slate-600">
          Use these accounts to test the sales-to-reviewer workflow after uploading data. They are seeded at startup and
          are safe to use in local development.
        </p>
        <div className="overflow-hidden rounded border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Password</th>
                <th className="px-3 py-2">Access</th>
              </tr>
            </thead>
            <tbody>
              {DEV_ACCOUNTS.map((account) => (
                <tr key={account.role} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{account.label}</td>
                  <td className="px-3 py-2 text-slate-700">{account.email}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{account.password}</td>
                  <td className="px-3 py-2 text-slate-600">{account.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="grid gap-4 md:grid-cols-4">
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
        <SectionCard title="Strong Route Runs">
          <p className="text-3xl font-semibold">{strongRouteCount}</p>
          <p className="text-sm text-slate-600">Proposals escalated to the stronger route</p>
        </SectionCard>
      </div>
      <SectionCard title="Latest Trace">
        <p className="text-sm text-slate-700">{latestTraceId || "Refresh metrics to load the latest proposal trace."}</p>
      </SectionCard>
    </div>
  );
}
