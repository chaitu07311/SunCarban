export type BriefPayload = {
  crop_type: string;
  geography: string;
  season: string;
  acreage: number;
  number_of_farmers: number;
  soil_issues: string;
  trial_objective: string;
  application_method: string;
  duration_days: number;
  pricing_inputs: Record<string, unknown>;
  commercial_notes: string;
};

export type ProposalResponse = {
  id: number;
  brief_id: number;
  content: string;
  citations: Array<Record<string, unknown>>;
  governance_flags: string[];
  status: string;
  trace_id?: string | null;
  model_route?: Record<string, unknown> | null;
};

export type ReviewResponse = {
  id: number;
  proposal_id: number;
  reviewer_id: number;
  decision: string;
  comments: string;
  created_at: string;
};

export type AuditLogResponse = {
  action: string;
  entity_type: string;
  entity_id: number;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type IndexedDocumentStatus = {
  document_id: number;
  brief_id: number;
  file_name: string;
  version: number;
  chunk_count: number;
  indexed_at: string;
};

export type KnowledgeBaseIndexSummary = {
  total_documents: number;
  indexed_documents: number;
  total_chunks: number;
  latest_indexed_documents: IndexedDocumentStatus[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "suncarban_access_token";

export function getToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

async function apiFetch<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!headers.has("Content-Type") && init?.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (withAuth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Keep fallback message if response body is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<string> {
  const result = await apiFetch<{ access_token: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  setToken(result.access_token);
  return result.access_token;
}

export async function registerAndLogin(email: string, password: string, fullName: string, role: string): Promise<string> {
  await apiFetch<{ access_token: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    },
    false,
  );
  return login(email, password);
}

export async function createBrief(payload: BriefPayload): Promise<{ id: number }> {
  return apiFetch<{ id: number }>("/briefs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function validateBrief(briefId: number): Promise<{ missing_fields: string[]; ambiguous_fields: string[]; is_ready_for_proposal: boolean }> {
  return apiFetch(`/briefs/${briefId}/validation`);
}

export async function listBriefs(): Promise<Array<{ id: number; status: string }>> {
  return apiFetch<Array<{ id: number; status: string }>>("/briefs");
}

export async function generateProposal(briefId: number): Promise<ProposalResponse> {
  return apiFetch<ProposalResponse>("/proposals", {
    method: "POST",
    body: JSON.stringify({ brief_id: briefId }),
  });
}

export async function getProposal(proposalId: number): Promise<ProposalResponse> {
  return apiFetch<ProposalResponse>(`/proposals/${proposalId}`);
}

export async function listProposals(): Promise<ProposalResponse[]> {
  return apiFetch<ProposalResponse[]>("/proposals");
}

export async function getCitations(proposalId: number): Promise<Array<Record<string, unknown>>> {
  return apiFetch<Array<Record<string, unknown>>>(`/proposals/${proposalId}/citations`);
}

export async function submitReview(proposalId: number, decision: "approved" | "rejected", comments: string): Promise<{ review_id: number; proposal_status: string }> {
  return apiFetch<{ review_id: number; proposal_status: string }>("/reviews", {
    method: "POST",
    body: JSON.stringify({ proposal_id: proposalId, decision, comments }),
  });
}

export async function listReviews(proposalId: number): Promise<ReviewResponse[]> {
  return apiFetch<ReviewResponse[]>(`/reviews/proposal/${proposalId}`);
}

export async function listAuditLogs(): Promise<AuditLogResponse[]> {
  return apiFetch<AuditLogResponse[]>("/audit-logs");
}

export async function getKnowledgeBaseIndexSummary(): Promise<KnowledgeBaseIndexSummary> {
  return apiFetch<KnowledgeBaseIndexSummary>("/documents/indexing/summary");
}

export async function getKnowledgeBaseIndexSummaryFiltered(filters: {
  briefId?: number;
  sinceDays?: number;
}): Promise<KnowledgeBaseIndexSummary> {
  const params = new URLSearchParams();
  if (filters.briefId !== undefined) {
    params.set("brief_id", String(filters.briefId));
  }
  if (filters.sinceDays !== undefined) {
    params.set("since_days", String(filters.sinceDays));
  }
  const query = params.toString();
  return apiFetch<KnowledgeBaseIndexSummary>(`/documents/indexing/summary${query ? `?${query}` : ""}`);
}

export async function uploadDocument(briefId: number, file: File): Promise<{
  document_id: number;
  chunk_count: number;
  chroma_indexed: boolean;
  chroma_error: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch(`/documents/${briefId}`, {
    method: "POST",
    body: formData,
  });
}

export async function reindexDocument(documentId: number): Promise<{
  document_id: number;
  chunk_count: number;
  chroma_indexed: boolean;
  chroma_error: string;
}> {
  return apiFetch(`/documents/${documentId}/reindex`, {
    method: "POST",
  });
}
