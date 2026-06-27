from pathlib import Path


def extract_text_from_file(file_path: Path) -> str:
    suffix = file_path.suffix.lower()

    if suffix == ".txt":
        return file_path.read_text(encoding="utf-8", errors="ignore")

    if suffix == ".docx":
        try:
            from docx import Document  # type: ignore
        except Exception:
            return file_path.read_bytes().decode("utf-8", errors="ignore")

        doc = Document(str(file_path))
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])

    if suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore
        except Exception:
            return file_path.read_bytes().decode("utf-8", errors="ignore")

        reader = PdfReader(str(file_path))
        pages: list[str] = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages)

    return file_path.read_bytes().decode("utf-8", errors="ignore")


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    clean = " ".join(text.split())
    if not clean:
        return []

    chunks: list[str] = []
    start = 0
    step = max(1, chunk_size - overlap)

    while start < len(clean):
        end = min(len(clean), start + chunk_size)
        chunks.append(clean[start:end])
        if end == len(clean):
            break
        start += step

    return chunks
