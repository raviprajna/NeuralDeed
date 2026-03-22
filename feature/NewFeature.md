# New Features & Enhancements

## Part 1: Multi-Document Conversations

### Overview
Enable conversations to contain and reference multiple documents, allowing lawyers to analyze complete due diligence packages within a single conversation context.

---

## 1.1 Multi-Document Upload

**Feature:** Allow users to upload multiple documents to a single conversation

**User Stories:**
- As a lawyer, I want to upload multiple lease agreements to one conversation so I can compare them
- As a user, I want to add documents incrementally as I review a deal package
- As an associate, I want to see all documents in my conversation at a glance

**Requirements:**
- ✅ Remove the "one document per conversation" constraint
- ✅ Support unlimited document uploads per conversation (within storage limits)
- ✅ Each document maintains its own metadata (filename, page count, upload time)
- ✅ Documents persist when new ones are added
- ✅ Ability to upload documents at any point in the conversation

**Technical Changes:**
```
Database: Already supports multiple documents (relationship is one-to-many)
Backend: Remove validation check in upload_document() service
Frontend: Update upload UI to show "Add Another Document" option
```

---

## 1.2 Document List Display

**Feature:** Visual representation of all documents in the current conversation

**Design Options:**

**Option A: Sidebar Document List (Recommended)**
```
┌─────────────────┬──────────────────┬─────────────────┐
│  Conversations  │    Chat Area     │  Doc Viewer     │
│                 │                  │                 │
│ > Active Conv   │  Messages        │ ┌─────────────┐ │
│                 │                  │ │ Doc Dropdown│ │
│   ┌───────────┐ │                  │ ├─────────────┤ │
│   │Documents: │ │                  │ │   Lease.pdf │ │
│   │           │ │                  │ │  Title.pdf  │ │
│   │📄 Lease   │ │                  │ │  Env.pdf    │ │
│   │📄 Title   │ │                  │ └─────────────┘ │
│   │📄 Environ │ │                  │                 │
│   └───────────┘ │                  │   [PDF View]    │
└─────────────────┴──────────────────┴─────────────────┘
```

**Option B: Horizontal Document Tabs**
```
┌─────────────────────────────────────────────────────┐
│  Chat Area                                          │
│  ┌────────────────────────────────────────────────┐ │
│  │ [📄 Lease.pdf] [📄 Title.pdf] [📄 Environ.pdf] │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  Messages...                                        │
└─────────────────────────────────────────────────────┘
```

**Recommended: Option A** - Cleaner, scales better with many documents

**Document List Features:**
- Document name with icon
- Page count badge
- Upload timestamp (hover tooltip)
- Active document indicator
- Click to view in document viewer
- Remove document option (with confirmation)

---

## 1.3 Document Viewer Switching

**Feature:** Navigate between multiple documents without leaving the conversation

**UI Components:**
- **Dropdown selector** at top of document viewer
- **Keyboard shortcuts**: ⌘+[ and ⌘+] to cycle through documents
- **Quick preview**: Hover on document name shows first page thumbnail

**Document Viewer States:**
- **Empty state:** "No documents uploaded" with upload button
- **Single document:** Shows document with no selector
- **Multiple documents:** Shows dropdown with current document highlighted

**Interaction Flow:**
```
User clicks document in list
    ↓
Document viewer updates to show selected PDF
    ↓
Chat context remains (all documents still available)
    ↓
User can reference any document in questions
```

---

## 1.4 Multi-Document AI Context

**Feature:** AI can reference and compare across all uploaded documents

**Prompt Engineering Changes:**
```
Current Prompt Structure:
  Document: [single document text]
  History: [conversation]
  Question: [user message]

New Prompt Structure:
  Documents:
    - Document 1 (Lease.pdf):
      [text]

    - Document 2 (Title.pdf):
      [text]

  History: [conversation]
  Question: [user message]

  Instructions:
    - When answering, specify which document you're referencing
    - For comparisons, cite both documents
    - If info is in multiple docs, note the differences
```

**Enhanced AI Capabilities:**
- Compare clauses across documents
- Identify inconsistencies between documents
- Answer questions like "Which lease has the better indemnity clause?"
- Cross-reference information (e.g., "Does the title report match the lease description?")

**Context Window Management:**
- For conversations with many large documents, implement smart chunking
- Priority: Most recently uploaded + documents mentioned in recent conversation
- Fallback: Ask user which documents to include if context limit exceeded

---

## 1.5 Upload Flow Enhancements

**Current Flow:**
```
No document → Upload button → File picker → Upload → Done
```

**New Flow:**
```
Conversation view → "Add Document" button (always visible)
    ↓
File picker (supports multiple selection)
    ↓
Upload progress for each file
    ↓
Success notification: "3 documents added"
    ↓
Document list updates
    ↓
Continue conversation
```

**Upload UI Improvements:**
- Drag-and-drop support for multiple files
- Progress bars for each upload
- Batch upload (select multiple PDFs at once)
- Upload validation with clear error messages
- Retry failed uploads individually

---

## Part 2: Data-Driven Feature Enhancements

### Analysis Summary

**Key Insights from Beta Data:**

1. **Trust & Accuracy Crisis** (Priority: Critical)
   - Multiple mentions of AI "making things up"
   - Users citing fabricated clauses
   - Partners losing trust after one bad experience
   - Quote: *"Being confidently wrong is worse than being slow"*

2. **Multi-Document Need** (Priority: High)
   - Users re-uploading same document across conversations
   - Need for document comparison
   - Quote: *"I had to re-upload the same lease in three different chats"*

3. **Source Citation Value** (Priority: High)
   - Users love when AI cites specific sections
   - Frustration when citations are missing
   - Quote: *"When it tells me section 4.2, it's magic"*

4. **Workflow Integration Gaps** (Priority: Medium)
   - Copy-pasting to Word documents
   - Taking screenshots for team
   - Need for export/report features

---

## 2.1 Source Citation & Confidence Indicators

**The Problem:**
Beta users experienced hallucinations where AI cited non-existent clauses. This is a **trust-killer** in legal work where accuracy is paramount.

**Feature: Enhanced Source Verification**

**Component 1: Mandatory Citation Mode**
```python
# System prompt enhancement
"CRITICAL: You MUST cite specific page numbers and sections.
If you cannot find the answer in the documents, explicitly say:
'I cannot find this information in the provided documents.'

Format citations as: [Document Name, Page X, Section Y]
Never provide information without a citation."
```

**Component 2: Confidence Scoring**
```python
# After each response
confidence_level = calculate_confidence(
    sources_cited=count,
    response_length=length,
    document_coverage=percentage
)

Display to user:
🟢 High Confidence (3+ citations, <30% speculation)
🟡 Medium Confidence (1-2 citations, some interpretation)
🔴 Low Confidence (0 citations, or uncertain)
```

**Component 3: Grounded Response Extraction**
```python
# Quote extraction from documents
For each claim, extract the actual text from the PDF:
  Claim: "Rent is £50,000 per annum"
  Source: Lease.pdf, Page 3, Clause 2.1
  Extract: "The Annual Rent payable is Fifty Thousand Pounds (£50,000)"

Display extracted quote alongside AI response
```

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ 🤖 Assistant                          🟢 High   │
│                                                 │
│ The rent escalation clause allows for 3%       │
│ annual increases starting in year 2.           │
│                                                 │
│ 📎 Sources:                                     │
│ • Lease.pdf, Page 5, Section 3.2               │
│   "increases of no more than 3% per annum"     │
│                                                 │
│ [View in Document →]                            │
└─────────────────────────────────────────────────┘
```

**Why This Matters:**
- Addresses the #1 complaint from beta users
- Builds trust through transparency
- Allows users to verify AI responses quickly
- Partners can use tool with confidence

---

## 2.2 Document Comparison Mode

**The Problem:**
Beta users need to compare terms across multiple documents (e.g., comparing indemnity clauses across 3 leases)

**Feature: Side-by-Side Document Analysis**

**Comparison UI:**
```
┌─────────────────────────────────────────────────┐
│ Compare Documents                               │
│ [Lease A ▼] [Lease B ▼] [Lease C ▼]           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Topic: Indemnity Clauses                       │
│                                                 │
│ Lease A (Page 12):        Lease B (Page 8):    │
│ "Tenant indemnifies..."   "Landlord provides." │
│                                                 │
│ ⚠️ Key Difference: Lease A favors landlord     │
│                                                 │
│ [Generate Comparison Report]                    │
└─────────────────────────────────────────────────┘
```

**Comparison Features:**
- Select 2-4 documents to compare
- Choose comparison topic (or let AI identify key differences)
- Generate side-by-side clause comparison
- Highlight differences with explanations
- Export comparison as report

**AI Prompts for Comparison:**
```
"Compare the indemnity clauses across these documents:
- Document A: [text]
- Document B: [text]
- Document C: [text]

Provide:
1. Summary of each clause
2. Key differences
3. Which is most favorable to [landlord/tenant]
4. Missing provisions in any document"
```

---

## 2.3 Smart Document Search

**The Problem:**
Users mentioned needing Ctrl+F functionality and wanting to "jump to" specific clauses

**Feature: Multi-Document Semantic Search**

**Search Modes:**

**1. Keyword Search (Basic)**
- Search across all documents in conversation
- Returns: Document name, page number, surrounding context
- Highlights matches in document viewer

**2. Semantic Search (Advanced)**
- Natural language: "Find the force majeure clause"
- AI understands intent and finds relevant sections
- Works even if exact keywords don't match

**3. Cross-Document Search**
- "Find all rent escalation clauses across all leases"
- Groups results by document
- Allows comparison mode from search results

**UI:**
```
┌─────────────────────────────────────────────────┐
│ 🔍 Search in conversation                       │
│                                                 │
│ Found 8 results for "indemnity"                │
│                                                 │
│ 📄 Lease_A.pdf                                  │
│   Page 12 - Section 8.1: Tenant Indemnity     │
│   Page 15 - Section 9.3: Mutual Indemnity     │
│                                                 │
│ 📄 Lease_B.pdf                                  │
│   Page 8 - Clause 7: Indemnification          │
│                                                 │
│ [Compare All Results]                          │
└─────────────────────────────────────────────────┘
```

---

## 2.4 Conversation Export & Reports

**The Problem:**
Users copy-pasting to Word documents, taking screenshots

**Feature: Professional Report Generation**

**Export Options:**

**1. Chat Transcript Export**
- PDF or DOCX format
- Includes all messages with timestamps
- Preserves source citations
- Optional: Include document excerpts

**2. Analysis Report**
- Executive summary of findings
- Key points by topic
- Source citations
- Comparison tables (if applicable)

**3. Document Annotation Export**
- PDF with highlighted sections
- Comments linked to conversation
- Share with team members

**Report Templates:**
```
┌─────────────────────────────────────────────────┐
│ Generate Report                                 │
│                                                 │
│ ◉ Due Diligence Summary                        │
│   • Key findings from all documents            │
│   • Risk highlights                            │
│   • Recommendations                            │
│                                                 │
│ ○ Clause Comparison Report                     │
│   • Side-by-side analysis                      │
│   • Differences highlighted                    │
│                                                 │
│ ○ Chat Transcript                              │
│   • Full conversation export                   │
│                                                 │
│ Format: [DOCX ▼]  [Generate Report]           │
└─────────────────────────────────────────────────┘
```

---

## 2.5 Document Annotation & Highlighting

**The Problem:**
Users taking screenshots to highlight sections for team

**Feature: In-App Annotations**

**Annotation Tools:**
- **Highlight**: Select text in PDF, choose color
- **Comment**: Add notes to specific sections
- **Bookmark**: Mark important pages/clauses
- **Link to Chat**: Connect annotation to AI response

**Use Cases:**
- Highlight concerning clauses during review
- Add notes for junior associates
- Create bookmarks for quick reference
- Link AI explanations to specific sections

**Collaboration:**
```
Annotation → Save to conversation
          → Team members see highlights
          → AI aware of annotated sections
          → Export with annotations
```

---

## Feature Priority Matrix

### Must-Have (MVP - Part 1)
1. ✅ Multi-document upload capability
2. ✅ Document list/selector UI
3. ✅ Document viewer switching
4. ✅ AI context spanning multiple documents
5. ✅ Basic upload flow improvements

### High Priority (Part 2 - Trust & Accuracy)
1. 🎯 Enhanced source citation with extraction
2. 🎯 Confidence indicators
3. 🎯 Grounded response verification
4. 🎯 Document comparison mode
5. 🎯 Multi-document search

### Medium Priority (Workflow Integration)
1. 📊 Report generation
2. 📊 Chat transcript export
3. 📊 Document annotations
4. 📊 Template questions
5. 📊 Keyboard shortcuts

### Future Enhancements
1. 🔮 Team collaboration features
2. 🔮 Version comparison (document revisions)
3. 🔮 Batch processing
4. 🔮 Analytics dashboard
5. 🔮 Integration with legal practice management systems

---

## Implementation Phases

### Phase 1: Multi-Document Foundation (Part 1)
**Timeline:** Sprint 1 (Week 1-2)
- Remove single-document constraint
- Build document list UI
- Implement document switching
- Update AI prompts for multi-doc context
- Test with 2-5 documents per conversation

### Phase 2: Trust & Accuracy (Part 2 - Critical)
**Timeline:** Sprint 2 (Week 3-4)
- Implement mandatory citation system
- Add confidence scoring
- Build quote extraction
- Test accuracy with legal team
- Collect feedback on hallucination reduction

### Phase 3: Comparison & Search
**Timeline:** Sprint 3 (Week 5-6)
- Build comparison mode UI
- Implement semantic search
- Add cross-document analysis
- Test with real due diligence packages

### Phase 4: Workflow Integration
**Timeline:** Sprint 4 (Week 7-8)
- Report generation
- Export functionality
- Annotation tools
- Polish UX based on beta feedback

---

## Success Metrics

### Multi-Document Features
- **Adoption:** % of conversations with 2+ documents
- **Usage:** Avg documents per conversation
- **Engagement:** Time spent in multi-doc conversations vs single-doc
- **Completion:** % of users who successfully upload multiple docs

### Trust & Accuracy Features
- **Citation Rate:** % of responses with sources
- **Confidence Distribution:** Ratio of high/medium/low confidence responses
- **User Trust:** Survey: "I trust the AI responses" (1-5 scale)
- **Verification Time:** Time users spend verifying AI responses

### Overall Product Health
- **Retention:** Weekly active users (WAU)
- **Churn:** % users who stop after first bad experience
- **NPS:** Net Promoter Score from beta users
- **Use Case Completion:** % of due diligence workflows completed in-app

---

## Technical Considerations

### Performance
- **Context Window:** Monitor token usage with multiple large documents
- **Chunking Strategy:** Implement smart document chunking if needed
- **Caching:** Cache extracted text to avoid re-processing
- **Streaming:** Ensure streaming works with larger prompts

### Scalability
- **Storage:** Consider object storage (S3) for production
- **Database:** Index documents table for fast lookups
- **Search:** Implement vector embeddings for semantic search
- **Rate Limiting:** Protect API from abuse

### Security
- **Access Control:** Add user authentication
- **Document Privacy:** Ensure documents not shared across users
- **Audit Trail:** Log all document accesses
- **Encryption:** Encrypt documents at rest

---

## Open Questions for Brainstorming

1. **Context Window Strategy:**
   - When conversation has 10 documents (500 pages total), how do we handle context?
   - Smart selection vs ask user vs summarization approach?

2. **Comparison UI:**
   - Should comparison be a separate "mode" or inline in chat?
   - How many documents can realistically be compared at once?

3. **Citation Format:**
   - How specific should citations be? (Page, section, paragraph, line?)
   - Should we show the actual text excerpt inline or in a tooltip?

4. **Search Scope:**
   - Should search be per-conversation or global across all conversations?
   - How do we handle search in very large documents?

5. **Export Format:**
   - What report formats do lawyers actually use? (DOCX, PDF, both?)
   - Should reports include AI-generated summaries or just facts?

6. **Collaboration:**
   - Is multi-user collaboration in scope for v1?
   - If yes, what's the sharing model? (Per conversation, per document, both?)

These questions should be discussed and decided before implementation begins.
