"use client";

import { useState } from "react";

import { ApiAuthBar } from "../../components/ApiAuthBar";
import { SectionCard } from "../../components/SectionCard";
import {
  IndexedDocumentStatus,
  getKnowledgeBaseIndexSummaryFiltered,
  reindexDocument,
  uploadDocument,
} from "../../lib/api";

export default function KnowledgeBasePage() {
  const [message, setMessage] = useState("Use API Auth and click Refresh Summary.");
  const [briefId, setBriefId] = useState("1");
  const [sinceDays, setSinceDays] = useState("30");
  const [documentId, setDocumentId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [indexedDocuments, setIndexedDocuments] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [latestDocs, setLatestDocs] = useState<IndexedDocumentStatus[]>([]);

  async function loadSummary() {
    try {
      const parsedBriefId = briefId.trim() ? Number(briefId) : undefined;
      const parsedSinceDays = sinceDays.trim() ? Number(sinceDays) : undefined;
      const summary = await getKnowledgeBaseIndexSummaryFiltered({
        briefId: parsedBriefId,
        sinceDays: parsedSinceDays,
      });
      setTotalDocuments(summary.total_documents);
      setIndexedDocuments(summary.indexed_documents);
      setTotalChunks(summary.total_chunks);
      setLatestDocs(summary.latest_indexed_documents);
      setMessage("Knowledge base summary refreshed.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function handleUpload() {
    try {
      if (!selectedFile) {
        setMessage("Select a file to upload.");
        return;
      }
      const result = await uploadDocument(Number(briefId), selectedFile);
      setMessage(`Uploaded and indexed document #${result.document_id} (${result.chunk_count} chunks).`);
      await loadSummary();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function handleReindexLatest() {
    try {
      const targetDoc = latestDocs[0];
      if (!targetDoc) {
        setMessage("No indexed documents available for re-index.");
        return;
      }
      const result = await reindexDocument(targetDoc.document_id);
      setMessage(`Re-indexed latest document #${result.document_id} (${result.chunk_count} chunks).`);
      await loadSummary();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function handleReindexById() {
    try {
      if (!documentId.trim()) {
        setMessage("Enter a document id to re-index.");
        return;
      }
      const result = await reindexDocument(Number(documentId));
      setMessage(`Re-indexed document #${result.document_id} (${result.chunk_count} chunks).`);
      await loadSummary();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Knowledge Base Upload">
        <ApiAuthBar role="sales_user" />
        <p className="mb-4 text-slate-600">Upload approved PDF or DOCX files and trigger indexing.</p>
        <div className="grid gap-3 rounded border border-dashed border-emerald-400 p-6">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Brief ID</span>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              type="number"
              value={briefId}
              onChange={(e) => setBriefId(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Select File</span>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="w-fit rounded bg-emerald-700 px-4 py-2 text-white" onClick={handleUpload}>
            Upload and Index
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={loadSummary}>
            Refresh Summary
          </button>
          <button type="button" className="rounded bg-slate-200 px-4 py-2 text-slate-700" onClick={handleReindexLatest}>
            Re-index Latest
          </button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Filter Brief ID (optional)</span>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              type="number"
              value={briefId}
              onChange={(e) => setBriefId(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Since Days</span>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              type="number"
              min={1}
              value={sinceDays}
              onChange={(e) => setSinceDays(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Re-index by Document ID</span>
            <div className="flex gap-2">
              <input
                className="w-full rounded border border-slate-300 px-3 py-2"
                type="number"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
              />
              <button type="button" className="rounded bg-slate-700 px-3 py-2 text-white" onClick={handleReindexById}>
                Re-index
              </button>
            </div>
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-700">{message}</p>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Total Documents">
          <p className="text-3xl font-semibold">{totalDocuments}</p>
        </SectionCard>
        <SectionCard title="Indexed Documents">
          <p className="text-3xl font-semibold">{indexedDocuments}</p>
        </SectionCard>
        <SectionCard title="Total Chunks">
          <p className="text-3xl font-semibold">{totalChunks}</p>
        </SectionCard>
      </div>

      <SectionCard title="Upload History">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2 pr-4">Document</th>
              <th className="py-2 pr-4">Brief ID</th>
              <th className="py-2 pr-4">Ver.</th>
              <th className="py-2 pr-4">Chunks</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Indexed At</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {latestDocs.length === 0 ? (
              <tr>
                <td className="py-3 text-slate-400" colSpan={7}>
                  No indexed documents yet. Upload a file above and click Refresh Summary.
                </td>
              </tr>
            ) : null}
            {latestDocs.map((doc) => (
              <tr key={`${doc.document_id}-${doc.version}`} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium">{doc.file_name}</td>
                <td className="py-2 pr-4">{doc.brief_id}</td>
                <td className="py-2 pr-4">v{doc.version}</td>
                <td className="py-2 pr-4">{doc.chunk_count}</td>
                <td className="py-2 pr-4">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                    indexed
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-600">{new Date(doc.indexed_at).toLocaleString()}</td>
                <td className="py-2">
                  <button
                    type="button"
                    className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-900"
                    onClick={async () => {
                      try {
                        const result = await reindexDocument(doc.document_id);
                        setMessage(`Re-indexed #${result.document_id} → ${result.chunk_count} chunks`);
                        await loadSummary();
                      } catch (err) {
                        setMessage((err as Error).message);
                      }
                    }}
                  >
                    Re-index
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
