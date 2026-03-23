"""Document library service for managing reusable documents across conversations."""
from __future__ import annotations

import hashlib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from takehome.db.models import Document


async def get_library_documents(session: AsyncSession) -> list[Document]:
    """Get all documents in the global library."""
    stmt = select(Document).where(Document.is_library == 1).order_by(Document.uploaded_at.desc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def add_to_library(session: AsyncSession, document_id: str) -> Document | None:
    """Move a document to the global library (makes it reusable)."""
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    document = result.scalar_one_or_none()

    if document:
        document.is_library = 1
        # Detach from specific conversation (make it global)
        document.conversation_id = None
        await session.commit()
        await session.refresh(document)

    return document


async def link_document_to_conversation(
    session: AsyncSession, document_id: str, conversation_id: str
) -> Document | None:
    """Create a link between a library document and a conversation.

    Note: We create a new Document record that references the same file.
    This allows independent lifecycle management.
    """
    # Get the library document
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    library_doc = result.scalar_one_or_none()

    if not library_doc:
        return None

    # Create a new document record linked to the conversation
    linked_doc = Document(
        conversation_id=conversation_id,
        filename=library_doc.filename,
        file_path=library_doc.file_path,
        extracted_text=library_doc.extracted_text,
        page_count=library_doc.page_count,
        file_size=library_doc.file_size,
        file_hash=library_doc.file_hash,
        is_library=0,  # This is a conversation-specific link
    )
    session.add(linked_doc)
    await session.commit()
    await session.refresh(linked_doc)

    return linked_doc


async def find_duplicate_by_hash(session: AsyncSession, file_hash: str) -> Document | None:
    """Find an existing document by file hash to prevent duplicates."""
    stmt = select(Document).where(Document.file_hash == file_hash).limit(1)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()
