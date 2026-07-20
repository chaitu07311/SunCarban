"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { BriefPayload, createBrief, validateBrief } from "../../lib/api";

export default function BriefPage() {
  const [form, setForm] = useState<BriefPayload>({
    crop_type: "Cotton",
    geography: "Maharashtra",
    season: "Kharif",
    acreage: 120,
    number_of_farmers: 45,
    soil_issues: "Low organic carbon",
    trial_objective: "Improve yield and soil health",
    application_method: "Soil drench",
    duration_days: 90,
    pricing_inputs: { target_price: 4000 },
    commercial_notes: "Pilot with two clusters",
  });
  const [briefId, setBriefId] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<{
    is_ready_for_proposal: boolean;
    missing_fields: string[];
    ambiguous_fields: string[];
  } | null>(null);
  const [message, setMessage] = useState("");

  function update<K extends keyof BriefPayload>(key: K, value: BriefPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    try {
      const created = await createBrief(form);
      setBriefId(created.id);
      setValidationResult(null);
      setMessage(`Brief created: #${created.id}`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function handleValidate() {
    if (!briefId) {
      setMessage("Create a brief first.");
      return;
    }
    try {
      const result = await validateBrief(briefId);
      setValidationResult(result);
      setMessage("Validation results loaded.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <SectionCard title="Client Brief Form">
      <ApiAuthBar role="sales_user" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Crop Type</span>
          <input className="w-full rounded border border-slate-300 px-3 py-2" value={form.crop_type} onChange={(e) => update("crop_type", e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Geography</span>
          <input className="w-full rounded border border-slate-300 px-3 py-2" value={form.geography} onChange={(e) => update("geography", e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Season</span>
          <input className="w-full rounded border border-slate-300 px-3 py-2" value={form.season} onChange={(e) => update("season", e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Acreage</span>
          <input className="w-full rounded border border-slate-300 px-3 py-2" type="number" value={form.acreage} onChange={(e) => update("acreage", Number(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Number of Farmers</span>
          <input className="w-full rounded border border-slate-300 px-3 py-2" type="number" value={form.number_of_farmers} onChange={(e) => update("number_of_farmers", Number(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Application Method</span>
          <input className="w-full rounded border border-slate-300 px-3 py-2" value={form.application_method} onChange={(e) => update("application_method", e.target.value)} />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Trial Objective</span>
        <textarea className="w-full rounded border border-slate-300 px-3 py-2" rows={3} value={form.trial_objective} onChange={(e) => update("trial_objective", e.target.value)} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Soil Issues</span>
        <input className="w-full rounded border border-slate-300 px-3 py-2" value={form.soil_issues} onChange={(e) => update("soil_issues", e.target.value)} />
      </label>
      <div className="mt-4 flex gap-2">
        <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={handleSubmit}>
          Save Draft
        </button>
        <button type="button" className="rounded bg-emerald-600 px-4 py-2 text-white" onClick={handleValidate}>
          Validate Brief
        </button>
      </div>
      {(briefId || validationResult) ? (
        <div className="mt-4 overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Latest Brief ID</th>
                <th className="px-3 py-2">Ready For Proposal</th>
                <th className="px-3 py-2">Missing Fields</th>
                <th className="px-3 py-2">Ambiguous Fields</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-800">{briefId ? `#${briefId}` : "-"}</td>
                <td className="px-3 py-2 text-slate-700">
                  {validationResult ? (validationResult.is_ready_for_proposal ? "Yes" : "No") : "-"}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {validationResult ? (validationResult.missing_fields.join(", ") || "None") : "-"}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {validationResult ? (validationResult.ambiguous_fields.join(", ") || "None") : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </SectionCard>
  );
}
