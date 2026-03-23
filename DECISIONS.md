# Product Decisions: Why These 10 Features for MVP

**Decision Date:** March 2026
**Context:** Prioritizing MVP features for NeuralDeed based on market analysis, customer feedback, and Railway deployment constraints

---

## The Prioritization Framework

We evaluated 25+ potential features using four criteria:

1. **User Pain Intensity:** How badly do users need this? (Beta feedback)
2. **Market Differentiation:** Does this beat competitors? (Market analysis)
3. **Technical Feasibility:** Can we build it on Railway in 8-12 weeks? (Resource constraints)
4. **Trust Impact:** Does this build user confidence? (Legal market requirement)

Features were scored 1-10 on each criterion. Top 10 were selected for MVP.

---

## The Top 10: Why We Chose Each Feature

### 1. Verification Layer & Confidence Scoring

**Score:** 10/10/9/10 = 39/40

**Why This is #1:**

The customer feedback was crystal clear:
- "Being confidently wrong is worse than being slow" - Partner, Firm B
- "She got an answer that was completely fabricated... She doesn't trust it now" - Partner, Firm B
- "I'd pay double the licence fee if the AI would just tell me when it's not sure" - Partner, Firm A

**The Reality:** Hallucinations kill trust in legal tech. One bad answer and lawyers never come back. We've seen this destroy beta adoption - users excited in Week 1, gone by Week 3 after one bad experience.

**What Makes This Different from Competitors:**
- Harvey AI and others focus on speed over accuracy
- They don't show confidence scores or admit uncertainty
- This is our BIGGEST competitive advantage

**Technical Fit for Railway:**
- Two-pass verification is just two LLM calls (doable on Railway)
- Confidence scoring is simple logic
- No complex infrastructure needed

**The Risk if We Skip This:**
We lose users after first hallucination. Game over. This is table stakes for legal AI, not a nice-to-have.

---

### 2. Surgical Citation System

**Score:** 10/9/10/9 = 38/40

**Why This is #2:**

Another clear message from users:
- "When it tells me section 4.2, it's magic. Genuinely magic." - Associate, Firm A
- "When it doesn't cite anything specific, I have to go find it myself anyway, so what's the point?" - Associate, Firm A

**What This Solves:**
Lawyers need to verify everything. Without exact citations, they spend just as much time checking the AI's work as they would reading the document themselves. Citations turn the tool from "interesting toy" to "essential workflow".

**Market Differentiation:**
- Harvey AI has "section references" but they're basic
- Kira Systems has citations but no conversational AI
- We combine both: conversational AI + surgical citations

**Technical Fit:**
- Citation extraction is straightforward (chunk metadata + text extraction)
- Jump-to-location just needs PDF coordinates (PDF.js provides this)
- Hover previews are simple React components

**Why Not #1:**
Trust (verification) matters slightly more than convenience (citations). But this is a very close second.

---

### 3. Multi-Document Upload & Context

**Score:** 9/8/10/7 = 34/40

**Why This Made Top 3:**

Direct user request:
- "I had to re-upload the same lease agreement in three different chats" - Senior Associate, Firm D

**The Problem:**
Real estate deals have 5-20 documents (leases, title reports, surveys, etc.). Current single-doc limitation forces users to create multiple conversations, losing context and wasting time.

**Market Need:**
- Harvey AI has "Vaults" (500 docs) but no cross-document intelligence
- This is our opportunity to leap ahead

**Technical Feasibility:**
- Database already supports it (one-to-many relationship)
- Just need to remove artificial constraint
- Context window management is the only challenge (we'll use smart chunking)

**Why Top 3:**
Solves immediate pain + enables future features (comparison, search). This unlocks the product's full potential.

---

### 4. Document Comparison Mode

**Score:** 9/9/8/7 = 33/40

**Why This is #4:**

User quote:
- "I'd love to be able to compare what two different documents say about the same topic" - Associate, Firm F

**Market Gap:**
NO competitor has automated clause comparison with AI. Everyone does it manually or with basic diff tools. This is a genuine innovation opportunity.

**Use Case:**
Compare indemnity clauses across 3 leases to find the most favorable terms. Lawyers do this manually today - takes hours. We can do it in 30 seconds.

**Technical Complexity:**
More complex than basic Q&A, but doable:
- Extract relevant sections from each doc (RAG)
- Compare with structured LLM prompt
- Display in table format

**Railway Fit:**
All AI processing, no special infrastructure needed. Perfect for Railway.

---

### 5. Deal Workspaces & Context Persistence

**Score:** 8/7/9/8 = 32/40

**Why This is #5:**

**The Scaling Problem:**
As users get 10, 20, 50 deals, they need organization. Without deal workspaces, the app becomes unusable at scale.

**Context Persistence:**
AI remembering "you asked about termination rights in Conversation #2" is magic for complex deals.

**Why Not Higher:**
Not an immediate pain point (users start with 1-2 deals). But critical for retention and scaling to multiple users per firm.

**Technical Fit:**
Simple database grouping + LLM context management. No new infrastructure.

**The Long Game:**
This sets us up for team collaboration features later. Foundation piece.

---

### 6. Professional Report Generation

**Score:** 8/6/8/6 = 28/40

**Why This Made Top 10:**

User complaint:
- "Could you add some kind of report export? I'm copy-pasting answers from the chat into a Word doc" - Senior Associate, Firm E

**The Workflow Gap:**
AI analysis is useless if lawyers can't share it with clients. Report generation completes the workflow loop.

**Competitor Weakness:**
Everyone has copy-paste. No one has professional, branded reports. Easy win.

**Technical Fit:**
- DOCX generation libraries exist (docx.js)
- Template system is straightforward
- Export is just file generation + download

**Why Not Higher:**
Nice-to-have, not must-have. Users can copy-paste today. But this saves them time and looks professional.

---

### 7. Semantic Document Search

**Score:** 7/6/9/5 = 27/40

**Why This is #7:**

User request:
- "I miss being able to ctrl+F within it" - Trainee, Firm H

**The Feature:**
Search across all documents in a deal to find specific clauses. Both keyword (exact match) and semantic (natural language).

**Technical Fit for Railway:**
- PostgreSQL full-text search (built-in, no extra cost)
- Vector search using pgvector extension
- No separate search infrastructure needed

**Why This Ranks #7:**
Useful but not critical. Users can manually search PDFs today. This is a quality-of-life improvement, not a game-changer.

**The Upside:**
Semantic search ("Find force majeure clause") feels like magic. Good demo feature.

---

### 8. Real Estate Domain Intelligence

**Score:** 6/10/6/5 = 27/40

**Why This is #8:**

**Market Positioning:**
This is our "Harvey for Real Estate" differentiator. Generic legal AI doesn't understand metes & bounds, title exceptions, or lease terms.

**The Features:**
- Document classification (deed vs lease vs title report)
- Auto-extract key fields (parties, dates, property address)
- Real estate glossary (500+ terms)

**Why Not Higher:**
- Harder to build (domain-specific training)
- Not immediately painful for users
- Can be added incrementally

**Why Include in MVP:**
Marketing. We need something that screams "real estate specialist" to differentiate from Harvey AI and others.

---

### 9. Authentication & Access Control

**Score:** 10/3/10/8 = 31/40

**Why This is #9 (Despite High Score):**

**The Reality:**
Security is non-negotiable, but we've been testing without it in beta. We can't launch to paid users without proper authentication.

**What We Need:**
- Email/password login
- Session management
- Row-level security (users only see their data)
- Basic role-based access control

**Why Not Higher:**
Not a feature users see or care about directly. It's infrastructure. But critical for production.

**Technical Fit:**
- Simple email/password auth (bcrypt + JWT)
- Railway supports environment variables for secrets
- Supabase RLS or custom middleware

**The Timeline:**
This is actually first to build (need it for testing other features). But ranked by user value, not build order.

---

### 10. System Monitoring & Observability

**Score:** 9/2/10/9 = 30/40

**Why This is #10:**

**Production Readiness:**
We can't ship to paying customers without monitoring. Period.

**What We Need:**
- Error tracking (Sentry)
- Performance monitoring (Railway metrics)
- Usage analytics (PostHog)
- Alerts for critical issues

**Why This is Last:**
Users don't see it. It's for us (developers/operators). But essential for running a reliable service.

**Railway Advantage:**
Railway has built-in logging and metrics. We just need to integrate Sentry + PostHog. Straightforward.

**The SLOs:**
- 99.5% uptime
- < 1% API error rate
- < 300ms search response time
- < 5% hallucination rate

Without monitoring, we can't measure these. Can't improve what we don't measure.

---

## What We Explicitly Cut (And Why)

### Features 11-15 (Post-MVP Tier 1)

**11. Annotation & Highlighting**
- Users want this: "I find myself taking screenshots to highlight sections" - Associate, Firm C
- But workaround exists (screenshots)
- More complex than MVP features (canvas manipulation, persistence)
- **Decision:** Include in Month 3-4, not MVP

**12. Collaborative Issue Tracking**
- Great for teams, but MVP targets individual lawyers first
- Requires WebSockets, notifications, real-time sync
- **Decision:** Team features are Phase 2 (after we prove individual value)

**13. Document Version Comparison**
- Useful but niche (only for contract redlining)
- Technically complex (diff algorithms)
- **Decision:** Post-MVP

**14. Real-Time Collaboration**
- Cool but not critical
- Requires WebSocket infrastructure (adds complexity)
- **Decision:** Wait until we have 5+ users per firm

**15. Advanced Analytics Dashboard**
- Nice for admins, not end users
- Can use Railway/PostHog built-in dashboards initially
- **Decision:** Build custom dashboard post-MVP

### Features 16-20 (Post-MVP Tier 2)

**Visual Document Relationships**
- D3.js timelines and graphs look cool in demos
- Minimal user demand from beta
- **Decision:** Year 2 feature, not MVP

**Clause Library**
- Interesting long-term (build knowledge base over time)
- Zero value on Day 1 (library is empty)
- **Decision:** Post-MVP, after users have processed 100+ docs

**Multi-Stakeholder Views**
- Expands market (brokers, lenders)
- But beachhead is lawyers first
- Complex permissions system
- **Decision:** Month 6-9, after lawyer product is solid

**Mobile App**
- Users want it, but web app works on mobile browsers
- Native apps are 2x development effort
- **Decision:** Year 2, after web app is proven

**Practice Management Integrations**
- Clio, MyCase, NetDocuments connectors
- Important for enterprise sales, not early adopters
- **Decision:** Month 9-12, for enterprise deals

---

## The Railway Constraint

**Why Railway Matters:**

We're deploying on Railway, not AWS/GCP. This affects what we can build:

**Railway Strengths:**
- Monorepo deployment (frontend + backend together)
- Managed PostgreSQL (with pgvector support)
- Redis plugin (for caching)
- Automatic SSL/HTTPS
- Simple environment variables
- Built-in logging and metrics

**Railway Limitations:**
- No managed vector database (so we use PostgreSQL + pgvector)
- No Lambda/Cloud Functions (so we use background workers)
- No managed Kubernetes (so we keep architecture simple)

**Our Architectural Decisions Based on Railway:**

1. **No Pinecone:** Use PostgreSQL + pgvector extension instead
   - Pro: One less service to manage
   - Con: Slightly slower vector search (acceptable for MVP)

2. **No Separate Job Queue:** Use PostgreSQL + pg_cron for scheduled tasks
   - Pro: Simpler stack
   - Con: Less robust than Celery/Bull, but fine for MVP

3. **Cloudflare R2 for Storage:** Not Railway, but Railway doesn't have object storage
   - R2 is S3-compatible and cheaper
   - Perfect fit for document storage

4. **Monorepo Deployment:** Frontend + backend in one Railway service
   - Pro: Simpler deployments, shared types
   - Con: Can't scale frontend/backend independently (not a problem at MVP scale)

**The Bottom Line:**
Railway constraints pushed us toward simpler architecture. This is actually good for MVP - less moving parts, faster shipping, easier debugging.

---

## The Build Timeline

**Weeks 1-2:** Authentication & database schema
**Weeks 3-4:** Document upload & processing pipeline
**Weeks 5-6:** Basic RAG system (query, retrieve, answer)
**Weeks 7-8:** Verification layer & confidence scoring
**Weeks 9-10:** Citation system & UI
**Weeks 11-12:** Multi-doc support & comparison mode
**Weeks 13-14:** Deal workspaces & search
**Weeks 15-16:** Report generation & domain intelligence
**Weeks 17-18:** Monitoring, testing, bug fixes
**Weeks 19-20:** Beta testing with 10 lawyers, iterate

**Total:** 20 weeks (5 months) to production-ready MVP

---

## Success Criteria: How We'll Know We're Right

**Month 1 (Beta Launch with 10 lawyers):**
- Users upload 20+ documents
- Users ask 100+ questions
- Hallucination rate < 5%

**Month 3 (Paid Launch with 50 users):**
- 80% beta → paid conversion
- Users pay $75-150/month
- 4.0+ trust score
- 60%+ citation click-through rate

**Month 6 (Product-Market Fit):**
- 90% monthly retention
- Users saying "I can't do my job without this"
- Net Promoter Score > 40
- Organic word-of-mouth growth

**What Will Make Us Pivot:**
- Hallucination rate stays > 10% (trust problem)
- < 50% beta → paid conversion (pricing problem)
- Users stop using after 2 weeks (product doesn't solve real problem)

---

## The Honest Assessment

**What We're Betting On:**

1. Lawyers will pay for trust (verification + confidence) more than speed
2. Real estate lawyers are underserved (no Harvey equivalent)
3. Citation quality beats citation quantity
4. Multi-doc workflows are the unlock for complex deals

**What Could Go Wrong:**

1. OpenAI costs blow up (mitigate: usage-based pricing + caching)
2. Harvey AI launches real estate product (mitigate: move fast, build moat)
3. Hallucinations remain too high (mitigate: verification layer + manual review option)
4. Users don't pay $75-150/month (mitigate: free tier + usage-based pricing)

**Why We're Confident:**

The market research is clear. Customer feedback is strong. Competitors have weaknesses we can exploit. Technology is mature enough (LLMs work). And we're focused - 10 features, not 25.

Most importantly: Users are in pain. They're spending 8 hours per deal on document review. If we can make it 45 minutes with high trust, they'll pay. That's our bet.

---

## The One Thing We Won't Compromise On

**Trust.**

Every decision - from verification layer to citation system to "I don't know" responses - is about building trust.

In legal tech, you get one shot. One bad hallucination and you're done. So we're building for trust first, speed second, features third.

That's why verification is Feature #1. That's why we have confidence scores. That's why we admit uncertainty.

We'd rather ship 5 features that lawyers trust than 20 features they don't.

---

*These decisions will be revisited after MVP launch based on user data. But this is our best hypothesis today based on market research, customer feedback, and technical constraints.*

*Decision Document v1.0 - March 2026*
