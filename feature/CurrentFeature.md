# Current Features

## Overview
The application is a document Q&A tool designed for commercial real estate lawyers to review and analyze legal documents during due diligence. It provides AI-powered assistance for understanding complex legal documents through natural conversation.

---

## Core Capabilities

### 1. Conversation Management
**What it does:** Enables users to organize their document analysis sessions

**Features:**
- ✅ Create new conversations with auto-generated default titles
- ✅ List all conversations ordered by most recently updated
- ✅ Select and switch between different conversations
- ✅ Auto-generate meaningful titles from the first user message
- ✅ Delete conversations (with cascade deletion of messages and documents)
- ✅ View conversation metadata (created/updated timestamps)

**User Experience:**
- Sidebar shows all conversations with titles
- Active conversation highlighted
- Quick creation via "New Chat" button
- Confirmation before deletion

---

### 2. Document Upload & Processing
**What it does:** Handles PDF document ingestion and text extraction

**Features:**
- ✅ Upload PDF documents (up to 25MB)
- ✅ Automatic text extraction using PyMuPDF
- ✅ Page-aware text extraction (preserves page numbers)
- ✅ File validation (PDF format, size limits)
- ✅ Secure file storage with unique identifiers
- ✅ Document metadata tracking (filename, page count, upload time)

**Technical Details:**
- **Supported Format:** PDF only (application/pdf)
- **Max File Size:** 25MB
- **Text Extraction:** PyMuPDF (maintains page structure)
- **Storage:** Local filesystem with UUID-based naming

**Constraints:**
- ⚠️ One document per conversation (cannot add multiple documents)
- ⚠️ Cannot replace or remove uploaded documents
- ⚠️ Documents stored locally (not in database)

---

### 3. AI-Powered Chat
**What it does:** Provides intelligent Q&A about uploaded documents

**Features:**
- ✅ Context-aware conversations (maintains history)
- ✅ Real-time streaming responses (Server-Sent Events)
- ✅ Document-grounded answers (AI cites sections, clauses, pages)
- ✅ Source citation tracking (counts references to document parts)
- ✅ Graceful handling when no document is uploaded
- ✅ Legal domain expertise (specialized system prompt)

**AI Configuration:**
- **Model:** Claude Haiku 4.5 (claude-haiku-4-5-20251001)
- **Provider:** Anthropic via PydanticAI
- **System Prompt:** Specialized for legal document review
- **Context Window:** Includes full document text + conversation history

**Response Quality:**
- Cites specific sections, clauses, and page numbers
- Refuses to fabricate information not in the document
- Concise and precise answers (lawyer-friendly)
- Identifies when information is missing

---

### 4. Document Viewer
**What it does:** Displays uploaded PDF documents alongside the chat

**Features:**
- ✅ PDF rendering in browser
- ✅ Split-pane layout (chat + document viewer)
- ✅ Shows document metadata (filename, page count)
- ✅ Placeholder state when no document uploaded

**User Experience:**
- Side-by-side view of chat and document
- Easy reference while asking questions
- Responsive layout

**Constraints:**
- ⚠️ Cannot navigate between pages
- ⚠️ No search within document
- ⚠️ No annotation or highlighting
- ⚠️ Cannot view multiple documents

---

### 5. Message History
**What it does:** Maintains full conversation context

**Features:**
- ✅ Persistent message storage (PostgreSQL)
- ✅ Role-based messages (user, assistant, system)
- ✅ Timestamp tracking for each message
- ✅ Source citation count per assistant message
- ✅ Chronological ordering
- ✅ Auto-scroll to latest message

**Technical Details:**
- Messages stored in database with conversation relationship
- Cascade deletion when conversation is deleted
- Supports streaming display of in-progress responses

---

### 6. User Interface

**Layout Components:**
- **Chat Sidebar:** Conversation list and creation
- **Chat Window:** Message history and input
- **Document Viewer:** PDF display panel
- **Message Bubbles:** Differentiated user/assistant styling
- **Empty States:** Helpful prompts when no content

**Design System:**
- Tailwind CSS for styling
- Radix UI components (accessible primitives)
- Neutral color palette (professional)
- Responsive layout (adapts to screen size)

**Interaction Patterns:**
- Real-time streaming (visible typing effect)
- Loading states during operations
- Error handling with user-friendly messages
- Keyboard shortcuts (Enter to send)

---

## Technical Infrastructure

### Backend Services
1. **Conversation Service:** CRUD operations for conversations
2. **Document Service:** Upload, storage, and text extraction
3. **LLM Service:** AI agent integration and prompt management
4. **Message Service:** Chat handling and streaming

### Database Schema
- **Conversations Table:** id, title, timestamps
- **Messages Table:** id, conversation_id, role, content, sources_cited, timestamp
- **Documents Table:** id, conversation_id, filename, filepath, extracted_text, page_count, timestamp

### API Endpoints
- `GET /conversations` - List all conversations
- `POST /conversations` - Create new conversation
- `GET /conversations/{id}` - Get specific conversation
- `PATCH /conversations/{id}` - Update conversation title
- `DELETE /conversations/{id}` - Delete conversation
- `POST /documents/{conversation_id}/upload` - Upload document
- `GET /documents/{conversation_id}` - Get conversation document
- `GET /documents/{document_id}/pdf` - Download PDF
- `POST /messages/{conversation_id}` - Send message (streaming response)
- `GET /messages/{conversation_id}` - Get message history

---

## Performance Characteristics

**Fast Operations:**
- Conversation switching: Instant (cached in frontend)
- Message sending: <100ms to start streaming
- Document upload: ~2-5 seconds for typical legal PDFs

**Slower Operations:**
- Large document text extraction: ~5-10 seconds for 100+ pages
- First message in conversation: +200ms for title generation
- Large conversation history: Linear scaling with message count

---

## Security & Validation

**Input Validation:**
- ✅ File type checking (PDF only)
- ✅ File size limits (25MB)
- ✅ SQL injection prevention (ORM with parameterized queries)
- ✅ CORS configured for frontend access

**Data Handling:**
- ✅ Unique file naming (prevents collisions)
- ✅ Environment-based configuration (API keys in .env)
- ✅ Structured logging (audit trail)

**Not Implemented:**
- ⚠️ User authentication (no login system)
- ⚠️ Rate limiting (open API access)
- ⚠️ Document encryption (files stored in plaintext)
- ⚠️ Access control (all users see all conversations)

---

## Known Limitations

### Functional Limitations
1. **Single Document Constraint:** Cannot add multiple documents to one conversation
2. **No Document Management:** Cannot remove or replace uploaded documents
3. **No Cross-Document Queries:** Cannot ask questions across multiple documents
4. **No Document Navigation:** Viewer doesn't support page navigation or search
5. **No Conversation Export:** Cannot download or share conversations

### Technical Limitations
1. **Local File Storage:** Documents stored on filesystem (not scalable)
2. **No Vector Search:** Cannot do semantic search across documents
3. **Linear Context:** All text passed to AI (no chunking or retrieval)
4. **No Caching:** Every message hits the API (no response caching)
5. **No Offline Support:** Requires active backend connection

### UX Limitations
1. **No Multi-Window:** Cannot compare documents side-by-side
2. **No Annotations:** Cannot highlight or bookmark document sections
3. **No Templates:** No pre-built question templates for common scenarios
4. **No Collaboration:** Single-user experience (no sharing)
5. **No Analytics:** No usage insights or conversation statistics

---

## Use Cases Supported

### ✅ Currently Supported
- Review a single lease agreement and ask questions
- Analyze environmental assessment reports
- Understand specific clauses in commercial contracts
- Compare different sections within one document
- Get quick summaries of document sections
- Find specific information referenced in the document

### ❌ Not Supported
- Compare terms across multiple lease agreements
- Analyze a complete due diligence package (multiple docs)
- Track changes between document versions
- Generate comparison reports across properties
- Batch process multiple documents
- Share analysis with team members

---

## Summary

The current application provides a solid foundation for single-document Q&A with AI assistance. It excels at helping lawyers quickly understand and navigate individual legal documents through conversational interaction. However, it's limited by its single-document-per-conversation constraint and lacks features for multi-document analysis, which is critical for real-world due diligence workflows.

**Core Strengths:**
- Fast, streaming AI responses
- Clean, intuitive UI
- Reliable PDF text extraction
- Good conversation management
- Professional design for legal users

**Key Gaps for Production:**
- Multi-document support (critical for due diligence)
- Document comparison capabilities
- Search and navigation features
- Collaboration tools
- Analytics and insights
