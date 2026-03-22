# Implementation Decisions

This document tracks all major decisions made during feature development, including rationale, alternatives considered, and outcomes.

---

## Decision Framework

For each feature decision, we document:
1. **Context**: What problem are we solving?
2. **Options Considered**: What approaches did we evaluate?
3. **Decision Made**: What did we choose and why?
4. **Trade-offs**: What did we gain and give up?
5. **Success Criteria**: How will we know if this was the right choice?

---

## Part 1: Multi-Document Conversations

### Decision 1: Database Schema Changes

**Context:**
The database already supports multiple documents per conversation (one-to-many relationship). The constraint is only enforced in application code.

**Options Considered:**
1. **Keep existing schema, remove code constraint** (Recommended)
   - Pros: No migration needed, fastest implementation
   - Cons: None identified

2. **Add new fields to documents table** (page_order, is_primary, etc.)
   - Pros: Better organization
   - Cons: Unnecessary complexity for v1

3. **Create document_groups table**
   - Pros: Flexible grouping
   - Cons: Over-engineered for current needs

**Decision Made:** Option 1 - Remove code constraint only

**Rationale:**
- Database schema already correct
- Zero migration risk
- Faster to implement
- Can add metadata later if needed

**Trade-offs:**
- ✅ Gained: Speed, simplicity
- ❌ Lost: None (can add features incrementally)

**Success Criteria:**
- Users can upload 5+ documents to one conversation
- No performance degradation
- No data integrity issues

**Status:** ⏳ Pending Implementation

---

### Decision 2: Document List UI Placement

**Context:**
Need to show list of documents in a conversation. Must be easily accessible but not clutter the main chat area.

**Options Considered:**

**Option A: Expandable section in chat sidebar** (Recommended)
```
┌─────────────┐
│ Conversations│
│ > Active    │
│             │
│ Documents ▼ │
│ 📄 Lease    │
│ 📄 Title    │
└─────────────┘
```
Pros:
- Persistent visibility
- Groups with conversation
- Familiar pattern

Cons:
- Takes sidebar space
- Scrolling if many docs

**Option B: Dropdown in document viewer header**
```
┌─────────────────────┐
│ [Select Doc ▼]     │
│                     │
│   [PDF View]        │
└─────────────────────┘
```
Pros:
- Saves space
- Contextual to viewer

Cons:
- Hidden when not needed
- Extra click to see list

**Option C: Horizontal tabs above chat**
```
┌──────────────────────────┐
│ [Lease][Title][Environ] │
├──────────────────────────┤
│ Chat messages...         │
```
Pros:
- Visible, clickable
- Tab pattern familiar

Cons:
- Doesn't scale (10+ docs)
- Takes vertical space

**Decision Made:** To Be Decided

**Open Questions:**
- How many documents is typical? (Affects scaling)
- Should documents be always visible or on-demand?
- Mobile considerations?

**Next Steps:**
- Review usage data for document counts
- Create mockups for each option
- User test with beta users

**Status:** 🤔 Needs Discussion

---

### Decision 3: AI Context Management Strategy

**Context:**
With multiple documents, total context size can exceed model limits (200K tokens). Need strategy for which documents to include in prompts.

**Options Considered:**

**Option 1: Include All Documents Always**
- Pros: Simple, comprehensive
- Cons: Hits token limits quickly, expensive
- Max documents: ~3-5 medium PDFs

**Option 2: Smart Selection Based on Conversation**
- Use recent messages to determine relevant documents
- Pros: Efficient, scales better
- Cons: Complex logic, may miss context
- Max documents: ~10-15 PDFs

**Option 3: Let User Choose (Checkbox selection)**
```
☑ Lease A
☑ Title Report
☐ Environmental
☐ Survey
```
- Pros: User control, explicit
- Cons: Extra friction, user burden
- Max documents: Unlimited (user decides)

**Option 4: Hybrid Approach** (Recommended)
- Auto-include: Documents mentioned in last 3 messages
- Auto-include: Most recently uploaded document
- Allow user to manually select additional docs
- Pros: Best of both worlds
- Cons: Most complex to implement

**Decision Made:** To Be Decided

**Considerations:**
- Beta users uploaded avg 1-2 docs per conversation
- Edge case: Due diligence packages can have 20+ docs
- Cost impact: Each token costs money

**Testing Needed:**
- What's the typical token usage for 1, 3, 5, 10 documents?
- How often do users need all documents in context?
- Can we detect which documents are relevant?

**Status:** 🤔 Needs Discussion & Testing

---

### Decision 4: Upload Flow UX

**Context:**
Need to design the flow for adding multiple documents to a conversation.

**Options Considered:**

**Option A: Always-visible "Add Document" button**
- Button persistent in chat window
- Click → file picker → upload
- Pros: Always discoverable
- Cons: Button clutter

**Option B: Upload button in document viewer**
- Shows when no docs or in empty state
- Pros: Contextual
- Cons: Hidden when doc already shown

**Option C: Upload icon in message input area**
- Paperclip icon next to send button
- Familiar pattern (chat apps)
- Pros: Natural, space-efficient
- Cons: May be overlooked

**Option D: Drag & Drop Zone** (Recommended)
- Entire chat area accepts drops
- Visual overlay on drag
- Plus: Button in sidebar for click-to-upload
- Pros: Modern, flexible, power-user friendly
- Cons: Needs clear visual feedback

**Decision Made:** To Be Decided

**Questions:**
- Should we support multi-file selection?
- Show upload progress for large files?
- Allow cancel during upload?

**Status:** 🤔 Needs Discussion

---

## Part 2: Data-Driven Enhancements

### Decision 5: Addressing AI Hallucination

**Context:**
Critical feedback: AI fabricates information not in documents. Partners losing trust. Quote: *"Being confidently wrong is worse than being slow."*

**Root Cause Analysis:**
- Claude Haiku optimized for speed over accuracy
- Prompts don't emphasize citation requirements
- No verification of AI responses
- No way for users to detect hallucinations

**Options Considered:**

**Option 1: Switch to Claude Opus** (More accurate but slower/expensive)
- Pros: Fewer hallucinations
- Cons: 5x cost, 2x slower, may not solve completely

**Option 2: Enhanced System Prompts** (Recommended)
```python
"CRITICAL REQUIREMENTS:
1. ONLY answer based on provided documents
2. ALWAYS cite specific page/section
3. If uncertain, say 'I cannot find this information'
4. NEVER fabricate or infer information"
```
- Pros: Low cost, immediate impact
- Cons: Not 100% guaranteed

**Option 3: Post-Processing Verification**
- After AI response, verify each claim against source docs
- Highlight verified vs unverified statements
- Pros: Catches hallucinations
- Cons: Complex, slower responses

**Option 4: Confidence Scoring + Mandatory Citations** (Recommended)
- Require AI to provide confidence level (0-100%)
- Mandate citations for every claim
- Show confidence indicator to user
- Flag low-confidence responses
- Pros: Transparency, user can verify
- Cons: Not prevention, just detection

**Option 5: Retrieval-Augmented Generation (RAG)**
- Chunk documents into embeddings
- Retrieve relevant chunks for each question
- Only include retrieved chunks in context
- Pros: More grounded, scalable
- Cons: Complex implementation, changes architecture

**Decision Made:** Combination of Options 2 & 4

**Implementation Plan:**
1. Update system prompt with stricter requirements
2. Add confidence scoring to responses
3. Require citation format: [Document, Page, Section]
4. Show confidence indicator in UI
5. Extract and display quoted text from source

**Rationale:**
- Addresses immediate trust crisis
- Low implementation complexity
- Can iterate based on results
- Preserves current architecture
- Option to add RAG later if needed

**Trade-offs:**
- ✅ Gained: User trust, transparency, verifiability
- ❌ Lost: Some response speed (more careful AI)

**Success Criteria:**
- Zero reports of fabricated clauses
- 90%+ of responses have citations
- 80%+ high-confidence responses
- User survey: Trust score improves from 2.3 to 4.0+

**Testing Approach:**
- Create test suite of known-answer questions
- Compare responses before/after changes
- Track citation rates
- Beta test with partners who complained

**Status:** ✅ Decided - Ready for Implementation

---

### Decision 6: Document Comparison Feature Priority

**Context:**
Users want to compare clauses across multiple documents. Is this v1 scope?

**Data Points:**
- 8 users mentioned comparison needs
- Use case: Compare indemnity clause across 3 leases
- Use case: Check if title report matches lease description
- Workaround: Users currently open multiple tabs

**Options:**

**Option A: Include in v1 (with Multi-Document)**
- Build comparison mode alongside multi-doc upload
- Pros: Complete feature set
- Cons: Delays v1 launch

**Option B: v1.5 Follow-up Feature**
- Ship multi-doc upload first
- Add comparison in next sprint
- Pros: Faster initial launch
- Cons: Incomplete workflow

**Option C: Smart Default (No Special UI)**
- Let users ask comparison questions naturally
- AI handles comparison in regular chat
- Example: "Compare the indemnity clauses in both leases"
- Pros: Zero UI work, leverage AI
- Cons: Less structured, harder to export

**Decision Made:** To Be Decided

**Considerations:**
- How complex is comparison feature?
- Can we ship multi-doc without comparison?
- Will users be satisfied with AI-powered comparison (Option C)?

**Next Steps:**
- Prototype comparison chat responses
- Test if AI can do good comparisons without special UI
- Decide based on prototype quality

**Status:** 🤔 Needs Prototyping

---

### Decision 7: Report Export Format & Content

**Context:**
Users copy-pasting chat to Word. Need export feature. What format and content?

**User Quotes:**
- "I'm copy-pasting answers into a Word doc for the client"
- "Would be nice to export analysis reports"

**Options Considered:**

**Format Options:**
- PDF: ✅ Professional, can't edit
- DOCX: ✅ Editable, client-ready
- Markdown: ❌ Too technical
- HTML: ❌ Not standard in legal

**Content Options:**

**A: Simple Chat Transcript**
- All messages with timestamps
- Source citations preserved
- Pros: Simple, complete
- Cons: Not polished for clients

**B: AI-Generated Summary Report**
- Executive summary
- Key findings by category
- Risk highlights
- Recommendations
- Pros: Professional, value-add
- Cons: AI might hallucinate in summary

**C: Structured Analysis Report**
- Template-based (Due Diligence, Comparison, etc.)
- Sections: Documents Reviewed, Findings, Concerns, etc.
- Include chat Q&A in appendix
- Pros: Professional, organized
- Cons: More complex

**Decision Made:** To Be Decided

**Questions:**
- Do we need multiple report types?
- Should we show AI uncertainty in reports?
- Include or exclude low-confidence responses?
- How much branding/customization?

**User Research Needed:**
- What do lawyers actually send to clients?
- Interview beta users on report format preferences

**Status:** 🤔 Needs User Research

---

## Decision 8: Implementation Sequence

**Context:**
We have 7+ features planned. What order maximizes value and reduces risk?

**Factors:**
- User pain severity
- Implementation complexity
- Dependencies between features
- Quick wins vs long-term value

**Proposed Sequence:**

**Sprint 1: Trust & Multi-Doc Foundation** (Weeks 1-2)
1. Enhanced citations + confidence scoring (Critical trust issue)
2. Multi-document upload (Remove constraint)
3. Document list UI (Basic version)
4. Document viewer switching

Rationale: Fix trust issues immediately while enabling multi-doc

**Sprint 2: Multi-Doc Polish** (Weeks 3-4)
1. Drag & drop upload
2. Multi-doc AI context handling
3. Upload flow improvements
4. Document management (remove, reorder)

Rationale: Complete multi-doc experience

**Sprint 3: Analysis Tools** (Weeks 5-6)
1. Document search (keyword + semantic)
2. Comparison mode (if needed after testing)
3. Quote extraction UI
4. Enhanced source display

Rationale: Improve analysis workflow

**Sprint 4: Export & Polish** (Weeks 7-8)
1. Report generation
2. Annotation tools
3. UX polish based on feedback
4. Performance optimization

Rationale: Workflow integration

**Alternative Sequence:**
Start with multi-doc (Part 1 requirement) before trust features

**Decision Made:** To Be Decided

**Questions:**
- Can we afford to delay trust fixes?
- Should Part 1 be completely done before Part 2?
- Parallel workstreams?

**Status:** 🤔 Needs Discussion

---

## Open Questions & Brainstorming Topics

### Question 1: How Many Documents is "Too Many"?

**Context:** Need to set expectations and design for realistic limits

**Data Needed:**
- What's the largest due diligence package beta users have?
- At what point does UX break down?
- What's the cost impact of 20 documents per conversation?

**Options:**
- Hard limit (e.g., 10 documents max)
- Soft limit with warning
- No limit but smart context management
- Tiered pricing based on document count

**Status:** 📊 Needs Data Analysis

---

### Question 2: Should Search be Per-Conversation or Global?

**Scenarios:**
- **Per-Conversation**: "Find indemnity in these 3 leases"
- **Global**: "Show me all indemnity clauses I've ever reviewed"

**Trade-offs:**
- Per-conversation: Simpler, more focused
- Global: More powerful, harder to build

**User Need:**
- Do lawyers need cross-conversation search?
- Is the value worth the complexity?

**Status:** 🤔 Needs User Interviews

---

### Question 3: Collaboration Features in Scope?

**User Feedback:**
- "taking screenshots to share with team"
- "my associate tried it"

**Potential Features:**
- Share conversations with team members
- Comments/annotations by multiple users
- Team workspaces

**Questions:**
- Is this v1 or v2?
- What's the MVP for collaboration?
- Authentication/permissions complexity?

**Status:** 🔮 Future Consideration

---

## Decision Log Template

Use this template for new decisions:

```markdown
### Decision X: [Title]

**Context:**
[What problem are we solving? What's the background?]

**Options Considered:**
1. Option A
   - Pros:
   - Cons:
2. Option B
   - Pros:
   - Cons:

**Decision Made:** [Option X] or [To Be Decided]

**Rationale:**
[Why this choice?]

**Trade-offs:**
- ✅ Gained:
- ❌ Lost:

**Success Criteria:**
[How will we measure success?]

**Status:** [⏳ Pending | 🤔 Needs Discussion | ✅ Decided | ❌ Rejected]
```

---

## Next Steps

1. **Review this document** with the team
2. **Make decisions** on open items marked "To Be Decided"
3. **Prototype** uncertain features (comparison mode, context strategy)
4. **User test** UI mockups with beta users
5. **Update** this document as decisions are made
6. **Start implementation** with Sprint 1 priorities

---

## Notes

- This is a living document - update as we learn
- Include reasoning for *rejected* options (learn from what didn't work)
- Reference user quotes and data to keep decisions grounded
- Revisit decisions if new information emerges
- Don't be afraid to change course if needed

---

*Last Updated: 2026-03-22*
*Next Review: Before Sprint 1 kickoff*
