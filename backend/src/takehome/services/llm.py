from __future__ import annotations

import os
import re
from collections.abc import AsyncIterator

from pydantic_ai import Agent

from takehome.config import settings  # noqa: F401 — triggers ANTHROPIC_API_KEY export

# Check if running in local dev (Docker SSL issues) vs production
USE_SSL_WORKAROUND = os.environ.get("RAILWAY_ENVIRONMENT") is None

if USE_SSL_WORKAROUND:
    # Local development: disable SSL verification for Docker container issues
    import httpx
    from anthropic import AsyncAnthropic

    http_client = httpx.AsyncClient(verify=False)
    anthropic_client = AsyncAnthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
        http_client=http_client
    )

agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    system_prompt=(
        "You are a specialized legal document assistant for commercial real estate transactions. "
        "You help real estate lawyers analyze deeds, leases, title reports, surveys, and purchase agreements.\n\n"
        "CRITICAL INSTRUCTIONS:\n"
        "- ONLY answer based on the document content provided. Do not use general knowledge.\n"
        "- If the answer is not in the documents, respond: 'I cannot find this information in the provided documents.'\n"
        "- ALWAYS cite specific sections, clauses, pages, or document names when making claims.\n"
        "- NEVER fabricate or infer information that is not explicitly in the documents.\n"
        "- Be concise and precise. Real estate lawyers value accuracy over verbosity.\n"
        "- Understand real estate terminology: metes and bounds, easements, encumbrances, title exceptions, CC&Rs.\n"
        "- When uncertain, admit it. Say 'I am not certain' rather than guessing."
    ),
)

# Agent for verification (checks if claims are supported by sources)
verification_agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    system_prompt=(
        "You are a verification assistant. Your job is to check if claims are supported by source documents.\n\n"
        "Given an answer and source documents, you must:\n"
        "1. Identify each factual claim in the answer\n"
        "2. Check if each claim is directly supported by the sources\n"
        "3. Provide a confidence score (0-100) based on:\n"
        "   - How many claims are supported (more = higher confidence)\n"
        "   - How explicit the support is (exact quotes = higher confidence)\n"
        "   - Whether sources contradict claims (contradictions = very low confidence)\n\n"
        "Output format:\n"
        "CONFIDENCE: <number 0-100>\n"
        "VERIFIED: <list of verified claims>\n"
        "UNVERIFIED: <list of unverified or uncertain claims>"
    ),
)

# Apply SSL workaround only for local development
if USE_SSL_WORKAROUND and hasattr(agent, '_model') and hasattr(agent._model, 'client'):
    agent._model.client = anthropic_client
    if hasattr(verification_agent, '_model') and hasattr(verification_agent._model, 'client'):
        verification_agent._model.client = anthropic_client


async def generate_title(user_message: str) -> str:
    """Generate a 3-5 word conversation title from the first user message."""
    result = await agent.run(
        f"Generate a concise 3-5 word title for a conversation that starts with: '{user_message}'. "
        "Return only the title, nothing else."
    )
    title = str(result.output).strip().strip('"').strip("'")
    # Truncate if too long
    if len(title) > 100:
        title = title[:97] + "..."
    return title


async def chat_with_document(
    user_message: str,
    document_text: str | None,
    conversation_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Stream a response to the user's message, yielding text chunks.

    Builds a prompt that includes document context and conversation history,
    then streams the response from the LLM.
    """
    # Build the full prompt with context
    prompt_parts: list[str] = []

    # Add document context if available
    if document_text:
        prompt_parts.append(
            "The following is the content of the document being discussed:\n\n"
            "<document>\n"
            f"{document_text}\n"
            "</document>\n"
        )
    else:
        prompt_parts.append(
            "No document has been uploaded yet. If the user asks about a document, "
            "let them know they need to upload one first.\n"
        )

    # Add conversation history
    if conversation_history:
        prompt_parts.append("Previous conversation:\n")
        for msg in conversation_history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                prompt_parts.append(f"User: {content}\n")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}\n")
        prompt_parts.append("\n")

    # Add the current user message
    prompt_parts.append(f"User: {user_message}")

    full_prompt = "\n".join(prompt_parts)

    async with agent.run_stream(full_prompt) as result:
        async for text in result.stream_text(delta=True):
            yield text


def count_sources_cited(response: str) -> int:
    """Count the number of references to document sections, clauses, pages, etc."""
    patterns = [
        r"section\s+\d+",
        r"clause\s+\d+",
        r"page\s+\d+",
        r"paragraph\s+\d+",
    ]
    count = 0
    for pattern in patterns:
        count += len(re.findall(pattern, response, re.IGNORECASE))
    return count


def extract_citations(answer: str, document_text: str | None, document_name_to_id: dict[str, str] | None = None) -> list[dict]:
    """Extract citations from AI answer with page numbers and text snippets.

    Args:
        answer: The AI response text
        document_text: Combined text from all documents
        document_name_to_id: Mapping of document filenames to their IDs

    Returns:
        list: List of citation dictionaries with page_number, section, and extracted_text
    """
    if not document_text:
        return []

    citations = []

    # Pattern to match citations like "Section 4", "Page 3", "Clause 2.1"
    citation_patterns = [
        (r"section\s+(\d+(?:\.\d+)?)", "section"),
        (r"page\s+(\d+)", "page"),
        (r"clause\s+(\d+(?:\.\d+)?)", "clause"),
        (r"paragraph\s+(\d+(?:\.\d+)?)", "paragraph"),
    ]

    # Try to determine which document each citation belongs to
    # Split by document markers if multi-doc
    doc_sections = []
    if "=== Document:" in document_text:
        parts = document_text.split("=== Document:")
        for part in parts[1:]:
            lines = part.split("\n", 1)
            doc_name = lines[0].strip().replace("===", "").strip()
            doc_content = lines[1] if len(lines) > 1 else ""
            doc_sections.append((doc_name, doc_content))
    else:
        doc_sections = [("Document", document_text)]

    for pattern, cite_type in citation_patterns:
        matches = re.finditer(pattern, answer, re.IGNORECASE)
        for match in matches:
            reference = match.group(1)

            # Extract snippet from document around this reference
            search_pattern = rf"(?:section|clause|paragraph)\s+{re.escape(reference)}"

            extracted_text = ""
            page_number = 1
            source_doc_name = doc_sections[0][0] if doc_sections else "Document"

            # Find which document this citation belongs to
            for doc_name, doc_content in doc_sections:
                doc_match = re.search(search_pattern, doc_content, re.IGNORECASE)
                if doc_match:
                    source_doc_name = doc_name
                    # Get 200 characters around the match
                    start = max(0, doc_match.start() - 50)
                    end = min(len(doc_content), doc_match.end() + 150)
                    extracted_text = doc_content[start:end].strip()
                    extracted_text = " ".join(extracted_text.split())

                    # Extract page number from document structure
                    if "--- Page" in doc_content:
                        pages = doc_content.split("--- Page ")
                        for idx, page_content in enumerate(pages[1:], 1):
                            if search_pattern in page_content:
                                page_number = idx
                                break
                    break

            # Map document name to ID if available
            doc_id = None
            if document_name_to_id and source_doc_name in document_name_to_id:
                doc_id = document_name_to_id[source_doc_name]

            citation = {
                "type": cite_type,
                "reference": reference,
                "page_number": page_number,
                "document_name": source_doc_name,
                "document_id": doc_id,
                "extracted_text": extracted_text[:200] if extracted_text else f"{cite_type.capitalize()} {reference}",
                "confidence": 90
            }
            citations.append(citation)

    # Deduplicate citations by reference
    seen = set()
    unique_citations = []
    for cit in citations:
        key = f"{cit['type']}_{cit['reference']}_{cit['page_number']}"
        if key not in seen:
            seen.add(key)
            unique_citations.append(cit)

    return unique_citations


async def generate_starter_questions(document_text: str, document_names: list[str]) -> list[str]:
    """Generate 4 contextual starter questions based on document content.

    Args:
        document_text: Combined text from all documents
        document_names: List of document filenames

    Returns:
        list: 4 contextual starter questions
    """
    doc_list = ", ".join(document_names)
    prompt = (
        f"Based on these documents: {doc_list}\n\n"
        f"Document content preview:\n{document_text[:2000]}\n\n"
        "Generate exactly 4 concise, specific starter questions that would help analyze these documents. "
        "Questions should be:\n"
        "- Specific to the actual content and document type\n"
        "- Actionable and valuable for real estate legal review\n"
        "- Short (under 15 words each)\n"
        "- Directly answerable from the documents\n\n"
        "Format: Return ONLY the 4 questions, one per line, numbered 1-4."
    )

    try:
        result = await agent.run(prompt)
        questions_text = str(result.output).strip()

        # Parse the questions
        lines = [line.strip() for line in questions_text.split('\n') if line.strip()]
        questions = []
        for line in lines[:4]:  # Take only first 4
            # Remove numbering like "1.", "1)", etc.
            clean = line.lstrip('0123456789.)- ').strip()
            if clean:
                questions.append(clean)

        # Fallback to generic if parsing fails
        if len(questions) < 4:
            return [
                "What are the key terms and conditions?",
                "Are there any concerning clauses?",
                "Summarize the main obligations",
                "What are the critical dates and deadlines?"
            ]

        return questions[:4]
    except Exception:
        # Return generic fallbacks on error
        return [
            "What are the key terms and conditions?",
            "Are there any concerning clauses?",
            "Summarize the main obligations",
            "What are the critical dates and deadlines?"
        ]


async def verify_response(answer: str, document_text: str | None) -> tuple[int, str]:
    """Verify the AI answer against source documents and return confidence score.

    Returns:
        tuple: (confidence_score 0-100, verification_details)
    """
    if not document_text:
        # No document to verify against
        return 50, "No document provided for verification"

    # Check for explicit "I don't know" responses
    uncertainty_phrases = [
        "cannot find",
        "not in the document",
        "not mentioned",
        "i don't know",
        "i am not certain",
        "unable to determine"
    ]

    answer_lower = answer.lower()
    if any(phrase in answer_lower for phrase in uncertainty_phrases):
        # AI explicitly admitted uncertainty - this is GOOD, high confidence in honesty
        return 95, "AI appropriately admitted uncertainty"

    # Count citations in the answer
    citation_count = count_sources_cited(answer)

    # Quick heuristic scoring (before full LLM verification)
    if citation_count == 0:
        # No citations at all - low confidence
        base_confidence = 40
    elif citation_count >= 3:
        # Multiple citations - high confidence
        base_confidence = 85
    else:
        # Some citations - medium confidence
        base_confidence = 70

    # Run verification with LLM (pass 2)
    verification_prompt = (
        f"Answer to verify:\n{answer}\n\n"
        f"Source document:\n{document_text[:2000]}\n\n"  # Truncate for speed
        "Verify if the claims in the answer are supported by the source."
    )

    try:
        result = await verification_agent.run(verification_prompt)
        verification_text = str(result.output)

        # Extract confidence score from verification
        confidence_match = re.search(r"CONFIDENCE:\s*(\d+)", verification_text, re.IGNORECASE)
        if confidence_match:
            llm_confidence = int(confidence_match.group(1))
            # Average the heuristic and LLM confidence
            final_confidence = (base_confidence + llm_confidence) // 2
        else:
            final_confidence = base_confidence

        # Cap confidence based on citation count
        if citation_count == 0:
            final_confidence = min(final_confidence, 50)

        return final_confidence, verification_text

    except Exception as e:
        # Verification failed - return base confidence
        return base_confidence, f"Verification failed: {str(e)}"
