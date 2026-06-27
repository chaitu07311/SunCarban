from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Document, User
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import (
    DocumentIndexResponse,
    DocumentResponse,
    IndexedDocumentStatusResponse,
    KnowledgeBaseIndexSummaryResponse,
)
from app.services.indexing import index_document
from app.services.audit import log_event


router = APIRouter(prefix="/documents", tags=["documents"])
UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/{brief_id}", response_model=DocumentIndexResponse)
def upload_document(
    brief_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    target = UPLOAD_DIR / file.filename
    with target.open("wb") as fh:
        fh.write(file.file.read())

    doc = Document(brief_id=brief_id, file_name=file.filename, file_path=str(target), version=1)
    db.add(doc)
    db.commit()
    db.refresh(doc)

    indexing_result = index_document(db, doc)

    log_event(db, "document_uploaded", "document", doc.id, user.id)
    log_event(db, "document_indexed", "document", doc.id, user.id, {"chunk_count": indexing_result["chunk_count"]})
    return DocumentIndexResponse(**indexing_result)


@router.get("/indexing/summary", response_model=KnowledgeBaseIndexSummaryResponse)
def get_indexing_summary(
    brief_id: int | None = Query(default=None),
    since_days: int | None = Query(default=None, ge=1, le=3650),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_query = db.query(Document)
    if brief_id is not None:
        base_query = base_query.filter(Document.brief_id == brief_id)
    if since_days is not None:
        cutoff = datetime.utcnow().replace(microsecond=0) - timedelta(days=since_days)
        base_query = base_query.filter(Document.created_at >= cutoff)

    total_documents = base_query.with_entities(func.count(Document.id)).scalar() or 0
    indexed_documents = base_query.filter(Document.indexed_at.is_not(None)).with_entities(func.count(Document.id)).scalar() or 0
    total_chunks = base_query.with_entities(func.coalesce(func.sum(Document.chunk_count), 0)).scalar() or 0

    recent_docs = (
        base_query
        .filter(Document.indexed_at.is_not(None))
        .order_by(Document.indexed_at.desc())
        .limit(10)
        .all()
    )

    latest_indexed_documents = [
        IndexedDocumentStatusResponse(
            document_id=doc.id,
            brief_id=doc.brief_id,
            file_name=doc.file_name,
            version=doc.version,
            chunk_count=doc.chunk_count,
            indexed_at=doc.indexed_at,
        )
        for doc in recent_docs
        if doc.indexed_at is not None
    ]

    return KnowledgeBaseIndexSummaryResponse(
        total_documents=total_documents,
        indexed_documents=indexed_documents,
        total_chunks=total_chunks,
        latest_indexed_documents=latest_indexed_documents,
    )


@router.get("/brief/{brief_id}", response_model=list[DocumentResponse])
def list_documents_for_brief(
    brief_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Document)
        .filter(Document.brief_id == brief_id)
        .order_by(Document.created_at.desc())
        .all()
    )


@router.post("/{document_id}/reindex", response_model=DocumentIndexResponse)
def reindex_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.version = doc.version + 1
    doc.indexed_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    indexing_result = index_document(db, doc)
    log_event(
        db,
        "document_reindexed",
        "document",
        doc.id,
        user.id,
        {"chunk_count": indexing_result["chunk_count"], "version": doc.version},
    )
    return DocumentIndexResponse(**indexing_result)
