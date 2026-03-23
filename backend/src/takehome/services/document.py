from __future__ import annotations

import hashlib
import io
import os
import uuid

import fitz  # PyMuPDF
import structlog
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from takehome.config import settings
from takehome.db.models import Document
from takehome.services.storage import save_file, read_file

logger = structlog.get_logger()


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA-256 hash of file content for deduplication."""
    return hashlib.sha256(content).hexdigest()


async def upload_document(
    session: AsyncSession, conversation_id: str, file: UploadFile
) -> Document:
    """Upload and process a PDF document for a conversation.

    Validates the file is a PDF, saves it to disk, extracts text using PyMuPDF,
    and stores metadata in the database.

    NOTE: Multi-document support enabled - multiple documents per conversation allowed.
    """
    # Multi-document support: removed single-document constraint

    # Validate file type
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        filename = file.filename or ""
        if not filename.lower().endswith(".pdf"):
            raise ValueError("Only PDF files are supported.")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    if file_size > settings.max_upload_size:
        raise ValueError(
            f"File too large. Maximum size is {settings.max_upload_size // (1024 * 1024)}MB."
        )

    # Calculate file hash for deduplication
    file_hash = calculate_file_hash(content)

    # Generate unique file key for storage
    original_filename = file.filename or "document.pdf"
    file_key = f"documents/{uuid.uuid4().hex}_{original_filename}"

    # Save to storage (R2 in production, local in development)
    storage_path = await save_file(content, file_key)

    logger.info("Saved uploaded PDF", filename=original_filename, storage_path=storage_path, size=len(content))

    # Extract text using PyMuPDF (works with bytes)
    extracted_text = ""
    page_count = 0
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        page_count = len(doc)
        pages: list[str] = []
        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text()  # type: ignore[union-attr]
            if text.strip():
                pages.append(f"--- Page {page_num + 1} ---\n{text}")
        extracted_text = "\n\n".join(pages)
        doc.close()
    except Exception:
        logger.exception("Failed to extract text from PDF", filename=original_filename)
        extracted_text = ""

    logger.info(
        "Extracted text from PDF",
        filename=original_filename,
        page_count=page_count,
        text_length=len(extracted_text),
    )

    # Create the document record
    document = Document(
        conversation_id=conversation_id,
        filename=original_filename,
        file_path=storage_path,  # Can be local path or R2 URL
        extracted_text=extracted_text if extracted_text else None,
        page_count=page_count,
        file_size=file_size,
        file_hash=file_hash,
        is_library=0,  # Not in library by default
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)

    logger.info(
        "Document saved to database",
        document_id=document.id,
        file_hash=file_hash[:16],
        file_size=file_size,
    )

    return document


async def get_document(session: AsyncSession, document_id: str) -> Document | None:
    """Get a document by its ID."""
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_document_for_conversation(
    session: AsyncSession, conversation_id: str
) -> Document | None:
    """Get the first document for a conversation (for backwards compatibility).

    NOTE: Use get_documents_for_conversation() for multi-document support.
    """
    stmt = select(Document).where(Document.conversation_id == conversation_id).limit(1)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_documents_for_conversation(
    session: AsyncSession, conversation_id: str
) -> list[Document]:
    """Get all documents for a conversation."""
    stmt = select(Document).where(Document.conversation_id == conversation_id).order_by(Document.uploaded_at.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def search_documents(
    session: AsyncSession, conversation_id: str, query: str
) -> list[dict]:
    """Search for text across all documents in a conversation.

    Returns a list of matches with document ID, page number, and surrounding context.
    """
    if not query.strip():
        return []

    documents = await get_documents_for_conversation(session, conversation_id)
    results = []
    search_term = query.lower().strip()

    for doc in documents:
        if not doc.extracted_text:
            continue

        # Split by page markers
        pages = doc.extracted_text.split("--- Page ")

        for page_section in pages[1:]:  # Skip the first empty split
            # Extract page number
            lines = page_section.split("\n", 1)
            if not lines:
                continue

            page_num_str = lines[0].strip().replace("---", "").strip()
            try:
                page_number = int(page_num_str)
            except ValueError:
                continue

            page_content = lines[1] if len(lines) > 1 else ""

            # Search within page content
            lower_content = page_content.lower()
            if search_term in lower_content:
                # Find all occurrences in this page
                start_idx = 0
                while True:
                    idx = lower_content.find(search_term, start_idx)
                    if idx == -1:
                        break

                    # Extract context around the match (150 chars before and after)
                    context_start = max(0, idx - 150)
                    context_end = min(len(page_content), idx + len(search_term) + 150)
                    match_text = page_content[context_start:context_end].strip()

                    results.append({
                        "document_id": doc.id,
                        "document_name": doc.filename,
                        "page_number": page_number,
                        "match_text": match_text,
                        "position": idx
                    })

                    start_idx = idx + 1

                    # Limit matches per page to avoid overwhelming results
                    if len([r for r in results if r["document_id"] == doc.id and r["page_number"] == page_number]) >= 3:
                        break

    # Limit total results
    return results[:50]


async def upload_to_library(session: AsyncSession, file: UploadFile) -> Document:
    """Upload a document directly to the library (no conversation).

    This allows documents to be uploaded once and linked to multiple conversations.
    """
    # Validate file type
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        filename = file.filename or ""
        if not filename.lower().endswith(".pdf"):
            raise ValueError("Only PDF files are supported.")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    if file_size > settings.max_upload_size:
        raise ValueError(
            f"File too large. Maximum size is {settings.max_upload_size // (1024 * 1024)}MB."
        )

    # Calculate file hash for deduplication
    file_hash = calculate_file_hash(content)

    # Check if this file already exists in library
    from takehome.services.document_library import find_duplicate_by_hash
    existing = await find_duplicate_by_hash(session, file_hash)
    if existing:
        logger.info("Document already in library", file_hash=file_hash[:16], existing_id=existing.id)
        return existing

    # Generate unique file key for storage
    original_filename = file.filename or "document.pdf"
    file_key = f"library/{uuid.uuid4().hex}_{original_filename}"

    # Save to storage (R2 in production, local in development)
    storage_path = await save_file(content, file_key)

    logger.info("Saved library PDF", filename=original_filename, storage_path=storage_path, size=file_size)

    # Extract text using PyMuPDF (works with bytes)
    extracted_text = ""
    page_count = 0
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        page_count = len(doc)
        pages: list[str] = []
        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text()  # type: ignore[union-attr]
            if text.strip():
                pages.append(f"--- Page {page_num + 1} ---\n{text}")
        extracted_text = "\n\n".join(pages)
        doc.close()
    except Exception:
        logger.exception("Failed to extract text from PDF", filename=original_filename)
        extracted_text = ""

    # Create library document (no conversation_id)
    document = Document(
        conversation_id=None,  # Library document
        filename=original_filename,
        file_path=storage_path,  # Can be local or R2
        extracted_text=extracted_text if extracted_text else None,
        page_count=page_count,
        file_size=file_size,
        file_hash=file_hash,
        is_library=1,  # Mark as library document
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)

    logger.info("Document added to library", document_id=document.id, file_hash=file_hash[:16])

    return document
