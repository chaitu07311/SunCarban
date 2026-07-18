"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import { AuditLogResponse, listAuditLogs } from "../../lib/api";

export default function AuditTrailPage() {
  const [rows, setRows] = useState<AuditLogResponse[]>([]);
  const [message, setMessage] = useState("");

  async function handleLoad() {
    try {
      const data = await listAuditLogs();
      setRows(data);
      setMessage(`Loaded ${data.length} event(s).`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <SectionCard title="Audit Trail">
      <ApiAuthBar role="admin" />
      <button type="button" className="mb-3 rounded bg-emerald-700 px-4 py-2 text-white" onClick={handleLoad}>
        Load Audit Events
      </button>
      {message ? <p className="mb-2 text-sm text-slate-700">{message}</p> : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Action</th>
            <th className="py-2">Entity</th>
            <th className="py-2">Entity ID</th>
            <th className="py-2">Trace</th>
            <th className="py-2">Model</th>
            <th className="py-2">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.action}-${row.entity_id}-${row.timestamp}`} className="border-b border-slate-100">
              <td className="py-2">{row.action}</td>
              <td className="py-2">{row.entity_type}</td>
              <td className="py-2">{row.entity_id}</td>
              <td className="py-2 text-xs text-slate-600">{String(row.payload?.trace_id ?? "-")}</td>
              <td className="py-2 text-xs text-slate-600">{String((row.payload?.model_route as { selected_model?: string } | undefined)?.selected_model ?? "-")}</td>
              <td className="py-2">{new Date(row.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}
