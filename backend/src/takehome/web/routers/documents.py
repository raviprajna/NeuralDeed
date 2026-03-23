from __future__ import annotations

import os
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import FileResponse

from takehome.db.session import get_session
from takehome.services.conversation import get_conversation
from takehome.services.document import get_document, upload_document, get_documents_for_conversation, upload_to_library, search_documents
from takehome.services.document_library import (
    get_library_documents,
    add_to_library,
    link_document_to_conversation,
)

logger = structlog.get_logger()

router = APIRouter(tags=["documents"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #


class DocumentOut(BaseModel):
    id: str
    conversation_id: str | None = None
    filename: str
    page_count: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class SearchResultOut(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    match_text: str
    position: int


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #


@router.post(
    "/api/conversations/{conversation_id}/documents",
    response_model=DocumentOut,
    status_code=201,
)
async def upload_document_endpoint(
    conversation_id: str,
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Upload a PDF document for a conversation.

    Only one document per conversation is allowed. Returns 409 if a document
    already exists.
    """
    # Verify the conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        document = await upload_document(session, conversation_id, file)
    except ValueError as e:
        error_message = str(e)
        if "already has a document" in error_message:
            raise HTTPException(status_code=409, detail=error_message)
        raise HTTPException(status_code=400, detail=error_message)

    logger.info(
        "Document uploaded",
        conversation_id=conversation_id,
        document_id=document.id,
        filename=document.filename,
    )

    return DocumentOut(
        id=document.id,
        conversation_id=document.conversation_id,
        filename=document.filename,
        page_count=document.page_count,
        uploaded_at=document.uploaded_at,
    )


@router.get("/api/documents/{document_id}/content")
async def serve_document_file(
    document_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Serve the raw PDF file for download/viewing."""
    from starlette.responses import Response
    from takehome.services.storage import read_file

    document = await get_document(session, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Read from storage (handles both local and R2)
    try:
        file_content = await read_file(document.file_path)
        return Response(
            content=file_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{document.filename}"'
            },
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found in storage")
    except Exception as e:
        logger.error("Failed to serve document", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve document")


@router.post("/api/library/documents", response_model=DocumentOut, status_code=201)
async def upload_library_document(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Upload a document directly to the global library."""
    try:
        document = await upload_to_library(session, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info("Document uploaded to library", document_id=document.id, filename=document.filename)

    return DocumentOut(
        id=document.id,
        conversation_id=document.conversation_id or "",
        filename=document.filename,
        page_count=document.page_count,
        uploaded_at=document.uploaded_at,
    )


@router.get("/api/library/documents", response_model=list[DocumentOut])
async def list_library_documents(
    session: AsyncSession = Depends(get_session),
) -> list[DocumentOut]:
    """Get all documents in the global library."""
    documents = await get_library_documents(session)
    return [DocumentOut.model_validate(doc) for doc in documents]


@router.post("/api/documents/{document_id}/add-to-library", response_model=DocumentOut)
async def add_document_to_library(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Add a document to the global library."""
    document = await add_to_library(session, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(document)


@router.post("/api/conversations/{conversation_id}/link-document/{document_id}", response_model=DocumentOut)
async def link_library_document(
    conversation_id: str,
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Link an existing library document to a conversation without re-uploading."""
    # Verify conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Link the document
    linked_doc = await link_document_to_conversation(session, document_id, conversation_id)
    if linked_doc is None:
        raise HTTPException(status_code=404, detail="Library document not found")

    logger.info(
        "Linked library document to conversation",
        conversation_id=conversation_id,
        document_id=linked_doc.id,
        source_doc_id=document_id,
    )

    return DocumentOut.model_validate(linked_doc)


@router.get("/api/conversations/{conversation_id}/documents", response_model=list[DocumentOut])
async def list_conversation_documents(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[DocumentOut]:
    """Get all documents in a conversation."""
    # Verify conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    documents = await get_documents_for_conversation(session, conversation_id)
    return [DocumentOut.model_validate(doc) for doc in documents]


@router.get("/api/conversations/{conversation_id}/search", response_model=list[SearchResultOut])
async def search_conversation_documents(
    conversation_id: str,
    q: str,
    session: AsyncSession = Depends(get_session),
) -> list[SearchResultOut]:
    """Search for text across all documents in a conversation."""
    # Verify conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not q.strip():
        return []

    results = await search_documents(session, conversation_id, q)
    return [SearchResultOut(**result) for result in results]


@router.delete("/api/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a document."""
    document = await get_document(session, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    await session.delete(document)
    await session.commit()

    logger.info("Document deleted", document_id=document_id)
