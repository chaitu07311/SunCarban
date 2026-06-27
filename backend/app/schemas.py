from datetime import datetime
from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str = Field(pattern=r".+@.+")
    password: str


class UserCreate(BaseModel):
    email: str = Field(pattern=r".+@.+")
    password: str = Field(min_length=6)
    full_name: str
    role: str = "sales_user"


class BriefCreate(BaseModel):
    crop_type: str
    geography: str
    season: str
    acreage: float
    number_of_farmers: int
    soil_issues: str = ""
    trial_objective: str
    application_method: str
    duration_days: int
    pricing_inputs: dict = Field(default_factory=dict)
    commercial_notes: str = ""


class BriefUpdate(BaseModel):
    crop_type: str | None = None
    geography: str | None = None
    season: str | None = None
    acreage: float | None = None
    number_of_farmers: int | None = None
    soil_issues: str | None = None
    trial_objective: str | None = None
    application_method: str | None = None
    duration_days: int | None = None
    pricing_inputs: dict | None = None
    commercial_notes: str | None = None
    status: str | None = None


class BriefResponse(BriefCreate):
    id: int
    created_by: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BriefValidationResponse(BaseModel):
    brief_id: int
    missing_fields: list[str]
    ambiguous_fields: list[str]
    is_ready_for_proposal: bool


class ProposalCreate(BaseModel):
    brief_id: int


class ProposalResponse(BaseModel):
    id: int
    brief_id: int
    content: str
    citations: list
    governance_flags: list
    status: str

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    brief_id: int
    file_name: str
    file_path: str
    version: int
    chunk_count: int

    class Config:
        from_attributes = True


class DocumentIndexResponse(BaseModel):
    document_id: int
    chunk_count: int
    chroma_indexed: bool
    chroma_error: str


class IndexedDocumentStatusResponse(BaseModel):
    document_id: int
    brief_id: int
    file_name: str
    version: int
    chunk_count: int
    indexed_at: datetime


class KnowledgeBaseIndexSummaryResponse(BaseModel):
    total_documents: int
    indexed_documents: int
    total_chunks: int
    latest_indexed_documents: list[IndexedDocumentStatusResponse]


class ReviewCreate(BaseModel):
    proposal_id: int
    decision: str
    comments: str = ""


class ReviewResponse(BaseModel):
    id: int
    proposal_id: int
    reviewer_id: int
    decision: str
    comments: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    action: str
    entity_type: str
    entity_id: int
    timestamp: datetime

    class Config:
        from_attributes = True
