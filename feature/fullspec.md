# NeuralDeed: Product Requirements & Technical Specifications

**Version:** 1.0 MVP
**Last Updated:** March 2026
**Target:** Real Estate Lawyers (Beachhead Market)
**Deployment:** Railway Platform

---

## Executive Summary

**Product Name:** NeuralDeed
**Positioning:** Harvey AI for Real Estate Transactions
**Mission:** Enable real estate professionals to analyze property documents with surgical precision using AI
**Core Value:** Trust through verification - every AI answer citable to exact source with confidence scoring

**Target Users (Priority Order):**
1. Real Estate Lawyers (Primary)
2. Commercial Brokers (Secondary)
3. Title Companies & Lenders (Tertiary)

---

## MVP Features (Top 10 - Production Ready)

### Feature 1: Verification Layer & Confidence Scoring

**Priority:** CRITICAL (Addresses #1 user complaint)

**User Story:** As a lawyer, I need the AI to admit when it's uncertain rather than fabricating information, because "being confidently wrong is worse than being slow."

**Requirements:**

1. **Two-Pass Verification:**
```typescript
// Pass 1: Generate answer from RAG
const answer = await generateAnswer(query, chunks);

// Pass 2: Verify each claim against sources
const verification = await verifyAnswer(answer, chunks);

// Response structure
interface VerifiedResponse {
  answer: string;
  confidence: number; // 0-100
  verificationStatus: 'verified' | 'partial' | 'uncertain';
  verifiedClaims: Claim[];
  unverifiedClaims: Claim[];
}
```

2. **Confidence Indicators:**
- Green badge (90-100%): High confidence - multiple strong citations
- Amber badge (70-89%): Medium confidence - some interpretation needed
- Red badge (0-69%): Low confidence or "I don't know"

3. **Refusal to Hallucinate:**
- If confidence < 70%, show: "I cannot find sufficient information in the provided documents"
- Show what WAS found vs what WASN'T found
- Never fabricate citations or clauses

**Acceptance Criteria:**
- System refuses to answer when evidence insufficient
- Hallucination rate < 5% (measured via test suite)
- Every response includes confidence score
- User can toggle "strict mode" (80%+ confidence required)

**Security:** Audit log all AI responses with confidence scores for legal compliance

**Performance:** Verification step adds <2s to response time

**Monitoring:**
- **SLI:** Hallucination rate per 100 queries
- **SLO:** < 5% hallucination rate (target: < 3%)
- **SLI:** Average confidence score
- **SLO:** > 80% average confidence

---

### Feature 2: Surgical Citation System

**Priority:** CRITICAL (Core differentiator)

**User Story:** As a lawyer, when AI tells me "section 4.2", it's magic. I need exact citations with text snippets.

**Requirements:**

1. **Citation Data Model:**
```typescript
interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  sectionNumber?: string;
  extractedText: string; // Actual quoted text from document
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}
```

2. **UI Components:**
- Inline citation badges: `[§4.2]` or `[Lease.pdf, p.5]`
- Hover to see text snippet (first 100 chars)
- Click to jump to exact location in document
- Highlight the cited text in PDF viewer

3. **Citation Extraction:**
- Extract page number from chunk metadata
- Extract surrounding context (±50 words)
- Link citation to specific PDF coordinates (if available)

**Acceptance Criteria:**
- Every AI claim has at least one citation
- Citations show actual text excerpt
- Click-to-navigate works 100% of time
- Citations remain visible when PDF page changes

**Security:** Citations include checksums to prevent tampering

**Performance:**
- Citation extraction: < 500ms
- Jump-to-location: < 1s

**Monitoring:**
- **SLI:** Citation accuracy rate
- **SLO:** > 95% citations point to correct location
- **SLI:** Citation click-through rate
- **SLO:** > 60% of citations are clicked by users

---

### Feature 3: Multi-Document Upload & Context

**Priority:** HIGH (Top user request)

**User Story:** As a lawyer, I need to upload multiple leases to one conversation so I can compare them without re-uploading.

**Requirements:**

1. **Remove Single-Document Constraint:**
```sql
-- Already supported in schema
CREATE TABLE documents (
  conversation_id UUID REFERENCES conversations(id),
  -- Multiple docs can have same conversation_id
);
```

2. **Batch Upload:**
- Support drag-drop of multiple PDFs
- Process uploads in parallel (max 5 concurrent)
- Show progress bar per file
- Handle failures gracefully with retry

3. **Document List UI:**
- Sidebar showing all documents in conversation
- Document name, page count, upload date
- Click to switch active document in viewer
- Remove document option (with confirmation)

4. **Multi-Doc AI Context:**
```python
# System prompt
"You have access to the following documents:
- Document 1 (Lease_A.pdf): [text]
- Document 2 (Lease_B.pdf): [text]

When answering:
- Specify which document you're citing
- Compare across documents when relevant
- Note any contradictions or inconsistencies"
```

**Acceptance Criteria:**
- Upload 10+ documents per conversation
- AI can reference any document in answer
- Document switching takes < 1s
- Context window managed efficiently (max 128K tokens)

**Security:**
- Encrypt documents at rest (Cloudflare R2)
- Isolate documents per user/conversation
- Row-level security in database

**Performance:**
- Upload: < 30s per document
- Processing (chunking/embedding): < 2min per document

**Monitoring:**
- **SLI:** Average documents per conversation
- **SLO:** Target 2.5 docs/conversation
- **SLI:** Upload success rate
- **SLO:** > 98% success rate

---

### Feature 4: Document Comparison Mode

**Priority:** HIGH (Competitive advantage)

**User Story:** As a lawyer, I need to compare indemnity clauses across 3 leases side-by-side to spot differences.

**Requirements:**

1. **Comparison UI:**
- Select 2-4 documents to compare
- Choose topic (e.g., "indemnity clause") or let AI find key differences
- Display side-by-side with differences highlighted
- Generate comparison summary

2. **Comparison Prompt:**
```
"Compare [topic] across these documents:
- Document A: [relevant section]
- Document B: [relevant section]

Provide:
1. Summary of each
2. Key differences
3. Which is more favorable to [party]
4. Missing provisions"
```

3. **Export Comparison:**
- Generate comparison table
- Export to PDF/DOCX
- Include all citations

**Acceptance Criteria:**
- Compare 2-10 documents simultaneously
- Detects contradictions with 85%+ accuracy
- Export completes in < 30s

**Security:** Comparison data not cached; generated on-demand

**Performance:** Comparison generation < 10s

**Monitoring:**
- **SLI:** Comparison usage rate
- **SLO:** Target 30% of users use comparison
- **SLI:** Comparison accuracy (manual review)
- **SLO:** > 85% accurate difference detection

---

### Feature 5: Deal Workspaces & Context Persistence

**Priority:** HIGH (Organization & scalability)

**User Story:** As a lawyer on a complex acquisition, I need all documents and conversations organized by deal, with AI remembering context.

**Requirements:**

1. **Deal Data Model:**
```typescript
interface Deal {
  id: string;
  name: string;
  clientName?: string;
  status: 'active' | 'completed' | 'archived';
  documents: Document[];
  conversations: Conversation[];
  createdAt: Date;
  updatedAt: Date;
}
```

2. **Deal Dashboard:**
- List all documents in deal
- List all conversations in deal
- Deal summary (AI-generated)
- Key dates and deadlines extracted from documents

3. **Context Persistence:**
- AI remembers previous conversations in same deal
- Smart suggestions: "You mentioned X in Conversation #2"
- Cross-conversation search within deal

**Acceptance Criteria:**
- Create deals with unlimited documents/conversations
- AI recalls context across conversations
- Deal search works (by name, client, date)
- Archive deals to reduce clutter

**Security:**
- Deal-level access control
- Audit trail for all deal activities

**Performance:**
- Deal dashboard loads in < 2s
- Cross-conversation search < 500ms

**Monitoring:**
- **SLI:** Average conversations per deal
- **SLO:** Target 4+ conversations/deal
- **SLI:** Context recall accuracy
- **SLO:** > 80% accurate cross-conversation references

---

### Feature 6: Professional Report Generation

**Priority:** MEDIUM (Workflow completion)

**User Story:** As a partner, I need to generate a client-ready due diligence report without copy-pasting.

**Requirements:**

1. **Report Templates:**
- Due Diligence Summary
- Clause Comparison Report
- Chat Transcript Export

2. **Report Structure:**
```typescript
interface Report {
  title: string;
  clientName: string;
  dealName: string;
  generatedBy: string;
  generatedAt: Date;
  sections: {
    title: string;
    content: string; // AI-generated or extracted
    citations: Citation[];
  }[];
}
```

3. **Export Formats:**
- DOCX (primary)
- PDF (secondary)
- Include firm branding (logo, colors)

**Acceptance Criteria:**
- Generate report in < 30s
- Include all citations with page refs
- Professional formatting
- Editable after export

**Security:** Watermark reports with generation timestamp & user

**Performance:** Report generation < 30s for 50-page report

**Monitoring:**
- **SLI:** Report generation usage
- **SLO:** Target 40% of conversations generate report
- **SLI:** Export success rate
- **SLO:** > 99% successful exports

---

### Feature 7: Semantic Document Search

**Priority:** MEDIUM (User request)

**User Story:** As a lawyer, I want Ctrl+F across all documents to find specific clauses quickly.

**Requirements:**

1. **Search Modes:**
- **Keyword Search:** Exact match across all docs
- **Semantic Search:** Natural language ("Find force majeure clause")
- **Cross-Doc Search:** Search within specific deal

2. **Search UI:**
```
🔍 Search in [Current Conversation / All Deals]

Results (8):
📄 Lease_A.pdf
  Page 12 - Section 8.1: "Tenant indemnity..."
  Page 15 - Section 9.3: "Mutual indemnity..."

📄 Lease_B.pdf
  Page 8 - Clause 7: "Indemnification..."

[Compare All Results]
```

3. **Search Index:**
- Full-text search using PostgreSQL GIN
- Semantic search using vector embeddings
- Results ranked by relevance

**Acceptance Criteria:**
- Search returns results in < 300ms
- Semantic search understands intent
- Highlight matches in document viewer
- Export search results

**Security:** Search respects user permissions (no cross-user results)

**Performance:** Search response time < 300ms (p95)

**Monitoring:**
- **SLI:** Search response time (p95)
- **SLO:** < 300ms
- **SLI:** Search success rate (results found)
- **SLO:** > 70% searches return results

---

### Feature 8: Real Estate Domain Intelligence

**Priority:** MEDIUM (Differentiation)

**User Story:** As a real estate lawyer, I need AI to understand lease terms, metes & bounds, and title exceptions.

**Requirements:**

1. **Document Classification:**
```typescript
const docType = classifyDocument(text);
// Returns: "deed", "lease", "title_report", "survey", "purchase_agreement"
```

2. **Smart Extraction:**
- Parties (grantor/grantee, landlord/tenant)
- Property address & legal description
- Rent/price & payment terms
- Key dates & deadlines
- Special conditions & exceptions

3. **Real Estate Glossary:**
- 500+ real estate terms
- Definitions & context
- Jurisdiction-specific variations

**Acceptance Criteria:**
- Document type classification > 90% accuracy
- Extract key fields from 80% of documents
- Glossary accessible via help panel

**Security:** Extracted data encrypted same as documents

**Performance:** Classification & extraction < 5s per document

**Monitoring:**
- **SLI:** Classification accuracy
- **SLO:** > 90% accurate
- **SLI:** Extraction success rate
- **SLO:** > 80% complete extractions

---

### Feature 9: Authentication & Basic Access Control

**Priority:** CRITICAL (Security)

**User Story:** As a firm administrator, I need to control who accesses our documents and conversations.

**Requirements:**

1. **Authentication:**
- Email/password login
- Magic link authentication
- Google OAuth (optional)
- Session management (7-day expiry)

2. **User Roles:**
```typescript
enum Role {
  ADMIN = "admin",       // Full access + user management
  LAWYER = "lawyer",     // Full document & conversation access
  ASSOCIATE = "associate", // Limited to assigned deals
  VIEWER = "viewer"      // Read-only access
}
```

3. **Access Control:**
- Row-level security (Supabase RLS)
- Users only see their own documents/conversations
- Admins can view all org data
- Audit log for sensitive actions

**Acceptance Criteria:**
- Secure authentication (bcrypt, JWT)
- Session timeout after 7 days
- Password reset flow works
- RLS prevents data leakage

**Security:**
- OWASP Top 10 compliance
- Rate limiting on login (5 attempts/10min)
- TLS 1.3 for all connections
- Encrypted passwords (bcrypt, 12 rounds)

**Performance:** Login response < 500ms

**Monitoring:**
- **SLI:** Failed login rate
- **SLO:** < 2% failed attempts (excluding brute force)
- **SLI:** Session security breaches
- **SLO:** 0 breaches

---

### Feature 10: System Monitoring & Observability

**Priority:** HIGH (Production readiness)

**User Story:** As a developer, I need to monitor system health and debug issues quickly.

**Requirements:**

1. **Logging:**
- Structured logs (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs for request tracing
- Railway Logs integration

2. **Error Tracking:**
- Sentry integration
- Error grouping & deduplication
- Source maps for frontend errors
- Alert on critical errors

3. **Metrics:**
```typescript
// Performance metrics
- Query latency (p50, p95, p99)
- Document processing time
- API response times

// Quality metrics
- Hallucination rate (manual review)
- User feedback (thumbs up/down)
- Citation accuracy

// Usage metrics
- Active users (DAU, WAU, MAU)
- Queries per user
- Documents uploaded
- Conversations created
```

4. **Dashboards:**
- System health dashboard (Railway metrics)
- User analytics (PostHog/Mixpanel)
- Error dashboard (Sentry)

**Acceptance Criteria:**
- All API routes logged
- Errors captured with stack traces
- Dashboards show real-time data
- Alerts configured for critical issues

**Security:** Logs exclude PII and document content

**Performance:** Logging overhead < 10ms per request

**Monitoring:**
- **SLI:** System uptime
- **SLO:** > 99.5% uptime
- **SLI:** API error rate
- **SLO:** < 1% error rate
- **SLI:** Mean time to resolution (MTTR)
- **SLO:** < 4 hours for critical bugs

---

## Post-MVP Features (Top 15)

### Tier 1: High Priority (Months 3-6)

**11. Annotation & Highlighting**
- In-app PDF annotations
- Highlight important clauses
- Add comments & bookmarks
- Share annotations with team

**12. Collaborative Issue Tracking**
- Flag risky clauses
- Assign to team members
- Comment threads
- Resolution workflow

**13. Document Version Comparison**
- Track document revisions
- Side-by-side diff view
- Change log
- Rollback capability

**14. Real-Time Collaboration**
- Live presence indicators
- Co-editing conversations
- WebSocket for updates
- Conflict resolution

**15. Advanced Analytics Dashboard**
- Deal velocity metrics
- Time saved per user
- Most-used features
- ROI calculator

### Tier 2: Medium Priority (Months 7-12)

**16. Visual Document Relationships**
- Timeline view (chronological)
- Dependency graph (D3.js)
- Property map view (if coordinates)
- Document cross-references

**17. Clause Library**
- Save favorable clauses
- Organize by type & favorability
- Search across library
- Export to template

**18. Multi-Stakeholder Views**
- Role-based permissions (broker, lender, client)
- Custom views per role
- Simplified language for non-lawyers
- Restricted document access

**19. Mobile App (View-Only)**
- iOS/Android apps
- View documents on mobile
- Read conversations
- Push notifications

**20. Integration: Practice Management Systems**
- Clio connector
- MyCase connector
- NetDocuments connector
- Sync documents & metadata

### Tier 3: Future Enhancements (Year 2+)

**21. OCR for Scanned Documents**
- Support scanned/image PDFs
- Text extraction via OCR
- Quality validation
- Confidence scoring

**22. AI Negotiation Advisor**
- Suggest counter-clauses
- Compare to market standards
- Risk assessment per clause
- Negotiation playbook

**23. Blockchain Document Attestation**
- Immutable document hash
- Timestamp proof
- Audit trail on blockchain
- Legal compliance

**24. White-Label Solution**
- Custom branding per firm
- Custom domain
- Firm-specific templates
- API for integrations

**25. Batch Processing**
- Upload 100+ documents
- Bulk analysis
- Generate bulk reports
- Scheduled processing

---

## Technical Architecture (Railway-Optimized)

### Infrastructure Stack

**Hosting:** Railway
- Monorepo deployment (frontend + backend)
- PostgreSQL database (Railway managed)
- Redis for caching (Railway plugin)
- Automatic SSL/HTTPS

**Frontend:**
- React + TypeScript + Vite
- TailwindCSS + Radix UI
- React Query (data fetching)
- Zustand (state management)
- PDF.js (document rendering)

**Backend:**
- Node.js + Express + TypeScript
- tRPC (type-safe APIs)
- PostgreSQL (Railway Postgres)
- Prisma ORM

**Storage:**
- Cloudflare R2 (document storage)
- PostgreSQL (metadata, embeddings)

**AI/ML:**
- OpenAI GPT-4 Turbo (primary)
- Claude 3.5 Sonnet (fallback)
- OpenAI Embeddings (text-embedding-3-large)
- LangChain (RAG orchestration)

**Monitoring:**
- Railway Logs & Metrics
- Sentry (error tracking)
- PostHog (analytics)

### Database Schema (Core Tables)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'lawyer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 'deed', 'lease', etc.
  file_url TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,
  processing_status TEXT DEFAULT 'pending',
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_ids UUID[], -- Multi-doc support
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  citations JSONB,
  confidence NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document Chunks (for RAG)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  text TEXT NOT NULL,
  embedding VECTOR(1536), -- Requires pgvector extension
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_deal ON documents(deal_id);
CREATE INDEX idx_conversations_deal ON conversations(deal_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

### Security & Compliance

**Data Protection:**
- Encryption at rest (R2 server-side encryption)
- Encryption in transit (TLS 1.3)
- Row-level security (Supabase RLS or custom middleware)
- Regular security audits

**Compliance:**
- GDPR compliance (data deletion on request)
- Attorney-client privilege protection
- No training on user data (opt-out clause with OpenAI)
- Audit logs for all document access

**Rate Limiting:**
```typescript
const RATE_LIMITS = {
  queries: { max: 100, window: '1h' },
  uploads: { max: 20, window: '1h' },
  exports: { max: 10, window: '1h' },
  login_attempts: { max: 5, window: '10m' }
};
```

### Performance Optimization

**Caching:**
- Redis cache for frequent queries
- Document embeddings cached
- User session cache

**Database:**
- Connection pooling (max 20 connections)
- Query optimization with indexes
- Prepared statements

**CDN:**
- Cloudflare CDN for static assets
- R2 with CDN for document delivery

**Cost Management:**
- OpenAI token usage monitoring
- Alert when monthly cost > $500
- Automatic rate limiting for high-volume users

---

## Success Metrics & KPIs

### Product Metrics
1. Time saved per deal: 8 hours → 45 min (target: 10x)
2. Hallucination rate: < 5% (target: < 3%)
3. Citation accuracy: > 95%
4. User trust score: > 4.0/5.0

### Usage Metrics
1. Active users: Target 50 users by Month 3
2. Queries per user: Target 50+ queries/month
3. Documents per deal: Target 2.5 docs/deal
4. Conversations per deal: Target 4+ conversations/deal

### Business Metrics
1. Monthly Recurring Revenue (MRR): Target $5K by Month 3
2. User retention: > 80% monthly retention
3. Net Promoter Score (NPS): > 40
4. Customer Acquisition Cost (CAC): < $500

---

## Risk Management

### Technical Risks
1. **AI Hallucinations:** Mitigated by verification layer + confidence scoring
2. **Performance at Scale:** Mitigated by caching + query optimization
3. **Data Privacy:** Mitigated by encryption + RLS + audit logs
4. **Cost Overruns:** Mitigated by usage monitoring + rate limiting

### Business Risks
1. **Harvey Expansion:** Mitigated by speed-to-market + real estate focus
2. **User Trust:** Mitigated by transparency + citations + "I don't know" responses
3. **Regulatory:** Mitigated by "tool not advice" positioning + legal review

---

## Glossary

- **RAG:** Retrieval-Augmented Generation (AI technique)
- **Citation:** Reference to source location in document
- **Chunk:** Text segment for embedding (typically 1000 tokens)
- **Embedding:** Vector representation of text (1536 dimensions)
- **Deal:** Workspace containing related documents & conversations
- **Confidence Score:** 0-100% indicating AI certainty
- **Hallucination:** AI generating false information not in source docs

---

*End of Specification v1.0*
