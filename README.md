# Orbital — Product Engineering Take-Home

Welcome! This is a take-home assessment for a Product Engineering role at Orbital.

You've been given a working baseline application: a document Q&A tool for commercial real estate lawyers. Users upload legal documents (leases, title reports, environmental assessments) and ask questions about them. The AI assistant answers questions grounded in the document content.

The app works, but it has limitations. Your job is to extend it.

---

## Setup

### Prerequisites
- Docker and Docker Compose
- just (command runner) — install via `brew install just` or `cargo install just`

That's it. Everything else runs inside containers.

### Getting Started

1. Clone this repository

2. Run the setup command:
```
just setup
```
   This copies `.env.example` to `.env` and builds the Docker images.

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_key_here
```
   We've provided an API key in the task email. You can also use your own.

4. Start everything:
```
just dev
```
   This starts PostgreSQL, the FastAPI backend (port 8000), and the React frontend (port 5173).
   Database migrations run automatically when the backend starts — no separate step needed.

5. Open http://localhost:5173 in your browser.

Your local `backend/src/` and `frontend/src/` directories are mounted into the containers —
edit files normally on your machine and changes hot-reload automatically.

### Sample Documents

We've included sample legal documents in `sample-docs/` for testing.

### Project Structure

- `frontend/` — React frontend (Vite + Tailwind + shadcn/Radix UI)
- `backend/` — FastAPI backend (Python 3.12 + SQLAlchemy + PydanticAI)
- `alembic/` — Database migrations
- `data/` — Product analytics and customer feedback (for Part 2)
- `sample-docs/` — Sample PDF documents for testing

### Useful Commands

- `just dev` — Start full stack (Postgres + backend + frontend)
- `just stop` — Stop all services
- `just reset` — Stop everything and clear database
- `just check` — Run all linters and type checks
- `just fmt` — Format all code
- `just db-init` — Run database migrations
- `just db-shell` — Open a psql shell
- `just shell-backend` — Shell into backend container
- `just logs-backend` — Tail backend logs

---

## Current Architecture

### Overview

The application follows a three-tier architecture with a React frontend, FastAPI backend, and PostgreSQL database. The system is designed to enable lawyers to upload legal documents and have AI-powered conversations about their content.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          React Frontend (Vite + TypeScript)              │   │
│  │  - ChatSidebar: Conversation management                  │   │
│  │  - ChatWindow: Message display & input                   │   │
│  │  - DocumentViewer: PDF rendering                         │   │
│  │  - Custom hooks: API communication                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST API
                            │ Server-Sent Events (SSE) for streaming
┌───────────────────────────▼─────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            FastAPI Backend (Python 3.12)                 │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              API Routers                           │  │   │
│  │  │  - /conversations: CRUD operations                │  │   │
│  │  │  - /messages: Chat & streaming                    │  │   │
│  │  │  - /documents: Upload & retrieval                 │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              Service Layer                         │  │   │
│  │  │  - conversation.py: Business logic                │  │   │
│  │  │  - document.py: PDF processing (PyMuPDF)          │  │   │
│  │  │  - llm.py: AI integration (PydanticAI)            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SQLAlchemy ORM
┌───────────────────────────▼─────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐        │   │
│  │  │Conversations│  │  Messages  │  │  Documents  │        │   │
│  │  │            │◄─┤            │  │             │        │   │
│  │  │  - id      │  │  - id      │  │  - id       │        │   │
│  │  │  - title   │  │  - conv_id │◄─┤  - conv_id  │        │   │
│  │  │  - created │  │  - role    │  │  - filename │        │   │
│  │  │  - updated │  │  - content │  │  - filepath │        │   │
│  │  │            │  │  - sources │  │  - text     │        │   │
│  │  └────────────┘  └────────────┘  │  - pages    │        │   │
│  │                                   └─────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
┌───────────────────────────▼─────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Anthropic Claude API                           │   │
│  │  - Model: claude-haiku-4-5-20251001                      │   │
│  │  - Streaming responses via PydanticAI                    │   │
│  │  - System prompt: Legal document assistant               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

**1. Document Upload Flow:**
```
User → Frontend → POST /documents/{conv_id}/upload
                      ↓
            Backend validates PDF
                      ↓
            Save file to disk (uploads/)
                      ↓
            Extract text with PyMuPDF
                      ↓
            Store metadata in PostgreSQL
                      ↓
            Return document object to Frontend
```

**2. Chat Message Flow:**
```
User types message → Frontend → POST /messages/{conv_id}
                                      ↓
                        Retrieve conversation history from DB
                                      ↓
                        Retrieve document text from DB
                                      ↓
                        Build prompt with context
                                      ↓
                        Stream to Claude API via PydanticAI
                                      ↓
                        Stream response back via SSE
                                      ↓
                        Save message to DB
                                      ↓
                        Update conversation timestamp
```

**3. Conversation Lifecycle:**
```
New Chat → Create Conversation (default title)
              ↓
        Upload Document (optional)
              ↓
        Send Messages (streaming responses)
              ↓
        Auto-generate title from first message
              ↓
        Continue conversation with context
```

### Key Technical Decisions

**Backend Stack:**
- **FastAPI**: High-performance async framework with automatic OpenAPI docs
- **SQLAlchemy**: ORM with async support for database operations
- **PydanticAI**: Type-safe AI agent framework for Claude integration
- **PyMuPDF**: Efficient PDF text extraction with page preservation
- **Alembic**: Database migration management

**Frontend Stack:**
- **React + TypeScript**: Type-safe component-based UI
- **Vite**: Fast development server with HMR
- **Tailwind CSS**: Utility-first styling
- **Radix UI (shadcn)**: Accessible component primitives

**Architecture Patterns:**
- **RESTful API**: Clear resource-based endpoints
- **Service Layer**: Business logic separated from API routes
- **ORM Pattern**: Type-safe database access with relationships
- **Streaming**: Server-Sent Events for real-time AI responses
- **Cascade Delete**: Automatic cleanup of related records

### Current Constraints

1. **Single Document per Conversation**: Each conversation can only have one document
2. **No Document Switching**: Cannot change or view different documents within a conversation
3. **Linear Context**: Conversation history is passed linearly to the AI
4. **File Storage**: Documents stored on local filesystem (not scalable)
5. **No Search**: Cannot search across conversations or documents
