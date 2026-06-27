from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Document, Embedding
from app.services.document_processing import chunk_text, extract_text_from_file


def index_document(db: Session, doc: Document) -> dict:
    extracted_text = extract_text_from_file(file_path=_resolve_path(doc.file_path))
    chunks = chunk_text(extracted_text)

    db.query(Embedding).filter(Embedding.document_id == doc.id).delete()

    for idx, chunk in enumerate(chunks, start=1):
        chunk_id = f"doc-{doc.id}-chunk-{idx}"
        metadata = {
            "document": doc.file_name,
            "section": f"Chunk {idx}",
            "document_id": doc.id,
            "chunk_index": idx,
        }
        db.add(Embedding(document_id=doc.id, chunk_id=chunk_id, metadata_json=metadata))

    chroma_indexed = False
    chroma_error = ""
    if settings.enable_chroma_retrieval and chunks:
        chroma_indexed, chroma_error = _index_in_chroma(doc, chunks)

    doc.extracted_text = extracted_text
    doc.chunk_count = len(chunks)
    doc.indexed_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    return {
        "document_id": doc.id,
        "chunk_count": len(chunks),
        "chroma_indexed": chroma_indexed,
        "chroma_error": chroma_error,
    }


def _resolve_path(path: str):
    from pathlib import Path

    return Path(path)


def _index_in_chroma(doc: Document, chunks: list[str]) -> tuple[bool, str]:
    try:
        import chromadb

        client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        collection = client.get_or_create_collection(settings.chroma_collection)

        ids = [f"doc-{doc.id}-chunk-{idx}" for idx, _ in enumerate(chunks, start=1)]
        metadatas = [
            {
                "document": doc.file_name,
                "section": f"Chunk {idx}",
                "document_id": doc.id,
                "chunk_index": idx,
            }
            for idx, _ in enumerate(chunks, start=1)
        ]

        collection.upsert(ids=ids, documents=chunks, metadatas=metadatas)
        return True, ""
    except Exception as exc:
        return False, str(exc)
