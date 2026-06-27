"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";

const ENV_DEFAULTS = {
  enable_langgraph: "false",
  enable_chroma_retrieval: "false",
  retrieval_confidence_threshold: "0.60",
  retrieval_top_k: "3",
  chroma_host: "localhost",
  chroma_port: "8001",
  chroma_collection: "suncarban_docs",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(ENV_DEFAULTS);
  const [message, setMessage] = useState("");

  function update(key: keyof typeof ENV_DEFAULTS, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // Settings are environment-driven in the backend; this UI shows current
    // values and provides guidance for ops teams updating .env files.
    setMessage(
      "Settings are applied via backend .env variables. Copy the values below and update backend/.env, then restart the server.",
    );
  }

  function copyEnv() {
    const text = Object.entries(settings)
      .map(([k, v]) => `${k.toUpperCase()}=${v}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setMessage("Copied .env snippet to clipboard.");
    });
  }

  const fields: Array<{ key: keyof typeof ENV_DEFAULTS; label: string; type: string; note?: string }> = [
    {
      key: "enable_langgraph",
      label: "Enable LangGraph Orchestration",
      type: "select",
      note: "Requires: pip install -r requirements-ai.txt",
    },
    {
      key: "enable_chroma_retrieval",
      label: "Enable Chroma Retrieval",
      type: "select",
      note: "Requires running Chroma service",
    },
    { key: "retrieval_confidence_threshold", label: "Retrieval Confidence Threshold", type: "number" },
    { key: "retrieval_top_k", label: "Retrieval Top-K", type: "number" },
    { key: "chroma_host", label: "Chroma Host", type: "text" },
    { key: "chroma_port", label: "Chroma Port", type: "number" },
    { key: "chroma_collection", label: "Chroma Collection Name", type: "text" },
  ];

  return (
    <div className="space-y-4">
      <SectionCard title="Admin Settings">
        <ApiAuthBar role="admin" />
        <p className="mb-4 text-sm text-slate-600">
          Configure agent orchestration, retrieval, and governance settings. These values correspond to environment
          variables in <code className="rounded bg-slate-100 px-1">backend/.env</code>.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(({ key, label, type, note }) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{label}</span>
              {type === "select" ? (
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={settings[key]}
                  onChange={(e) => update(key, e.target.value)}
                >
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              ) : (
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  type={type}
                  value={settings[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              )}
              {note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}
            </label>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={handleSave}>
            Save / Review
          </button>
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-white" onClick={copyEnv}>
            Copy .env Snippet
          </button>
        </div>
        {message ? (
          <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Role Access Summary">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Can Create Briefs</th>
              <th className="py-2 pr-4">Can Generate Proposals</th>
              <th className="py-2 pr-4">Can Review Proposals</th>
              <th className="py-2">Can View Audit Logs</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["sales_user", "✓", "✓", "—", "—"],
              ["reviewer", "—", "—", "✓", "✓"],
              ["admin", "✓", "✓", "✓", "✓"],
            ].map(([role, ...access]) => (
              <tr key={role} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium">{role}</td>
                {access.map((v, i) => (
                  <td
                    key={i}
                    className={`py-2 pr-4 ${v === "✓" ? "text-emerald-700" : "text-slate-400"}`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
