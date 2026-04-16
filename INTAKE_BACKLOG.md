# Intake System — Backlog

> Created: 2026-04-16
> Branch: `intake`

---

## Blockers

- [ ] **Customer intake form example** — need the actual form customers currently use to finalize form field structure. Entire form UI (Phase 3) is blocked until this is provided.

---

## AI Integration (Not Yet Wired)

> These are the three AI touch-points in the intake workflow. Each has a stub endpoint with a defined contract. When an API key / model is available, swap the stub function for real calls.

### 1. Submission Assistant Agent (Customer-facing)

**Priority: HIGH**
**Stub location:** `server/src/routes/intakeAi.ts` — `POST /api/intake/ai/assist`

- [ ] Connect to LLM API (Claude recommended)
- [ ] System prompt: coach customer to write stronger justifications, clarify requirements, improve score
- [ ] Context: pass current `formData` JSON so the agent understands what's been filled in
- [ ] Conversation history: consider storing chat turns per submission for continuity
- [ ] Rate limiting: prevent abuse (e.g. 20 messages per submission per hour)
- [ ] Guardrails: agent should not reveal scoring criteria, should not guarantee approval
- [ ] Streaming: consider SSE for real-time token streaming in the chat UI

### 2. Feasibility Scorer (Post-submission, Reviewer-facing)

**Priority: HIGH**
**Stub location:** `server/src/routes/intakeAi.ts` — `POST /api/intake/ai/score`

- [ ] Connect to LLM API
- [ ] Define scoring criteria (awaiting from stakeholders):
  - Business justification strength
  - Cost savings / ROI clarity
  - Technical feasibility
  - Strategic alignment
  - Completeness of submission
  - Risk level
- [ ] Scoring rubric: each criterion weighted, produces 0-100 composite
- [ ] Document analysis: extract text from uploaded PDFs/DOCX for context
- [ ] Consistency: consider running scorer 2-3 times and averaging to reduce variance
- [ ] Score explanation: each criterion gets a rationale string for reviewer transparency
- [ ] Re-scoring: allow reviewer to trigger re-score after customer edits (new version)

### 3. Design Review Document Generator (Post-approval)

**Priority: MEDIUM**
**Stub location:** `server/src/routes/intakeAi.ts` — `POST /api/intake/ai/design-review`

- [ ] Connect to LLM API
- [ ] Template sections to fill (from design-review-template.md):
  - Executive Summary (what, why, impact, timeline, risks)
  - Background (current state, problems, justification)
  - Goals (specific + measurable, non-goals, success metrics)
  - Solution Overview (approach, architecture, components)
  - Detailed Design (components, tech choices, data models, APIs)
  - Implementation Plan (phases, timeline, team, dependencies)
  - Resource Requirements (people, timeframes, alternatives)
  - Testing Strategy
  - Deployment Strategy
  - Operations (monitoring, alerting, logging, runbooks)
  - Risks (categorized, severity, mitigation, owners)
  - Alternatives Considered (2-3 with comparison tables)
  - Critical Gaps (unknowns with owners and dates)
  - Open Questions
- [ ] Direct field mapping (no AI needed): title → exec summary, problem statement → background, business goals → goals, cost savings → justification, timeline → implementation plan dates, stakeholders → resource requirements
- [ ] AI-required sections: solution overview, detailed design, tech choices, risk assessment, alternatives, testing/deployment/ops strategies
- [ ] Document analysis: extract content from uploads for additional context
- [ ] Hallucination prevention: use `[TO BE DETERMINED]` for anything not supported by submitted data
- [ ] Mermaid diagram generation: architecture diagrams, data flow diagrams (stretch goal)
- [ ] Gantt chart stub: timeline section with placeholder dates from desired timeline field

---

## Feature Enhancements (Post-MVP)

### Customer Experience
- [ ] **Email notifications** — notify customer on status changes (submitted → under_review, determination made)
- [ ] **In-app notifications** — extend existing notification system to intake events
- [ ] **Submission templates** — pre-built form templates for common request types
- [ ] **Draft auto-save** — auto-save form state every 30 seconds to prevent data loss
- [ ] **Collaborative submissions** — allow multiple customers to co-author a submission
- [ ] **Submission cloning** — "Submit similar request" button that pre-fills from a previous submission

### Reviewer Experience
- [ ] **Bulk actions** — select multiple submissions for batch status changes
- [ ] **Assignment to reviewer** — assign specific submissions to specific reviewers
- [ ] **Review comments / internal notes** — threaded comments on a submission visible only to reviewers
- [ ] **SLA tracking** — track time from submission to determination, flag overdue reviews
- [ ] **Reviewer workload dashboard** — show distribution of submissions across reviewers
- [ ] **Comparison view** — side-by-side comparison of two submissions for prioritization

### AI Enhancements
- [ ] **Streaming responses** — SSE for real-time AI chat and score generation
- [ ] **Document OCR** — extract text from scanned PDFs for AI analysis
- [ ] **Similar submission detection** — flag potential duplicates based on semantic similarity
- [ ] **Auto-categorization** — AI suggests priority, department, and execution type
- [ ] **Score trend analysis** — track scoring patterns across submissions for calibration

### Integration
- [ ] **Real CAIA/PIV integration** — replace mock login with actual certificate-based auth for customers
- [ ] **CAIA customer domain rules** — auto-set `userType=customer` based on CAIA attributes (e.g. external bureau)
- [ ] **Email provider wiring** — plug in Resend/SES/SendGrid for real email delivery
- [ ] **Export submissions** — CSV/Excel export of submission data for reporting
- [ ] **API webhooks** — notify external systems on submission status changes

### Admin & Config
- [ ] **Scoring criteria configuration** — admin UI to define/weight scoring criteria without code changes
- [ ] **Form field configuration** — admin UI to add/remove/reorder intake form fields
- [ ] **Determination workflow customization** — configurable determination options beyond backlog/denied/approved
- [ ] **Program auto-assignment rules** — rules to auto-assign approved projects to programs based on form data

---

## Known Technical Debt

- [ ] **Form fields as JSON blob** — flexible but no DB-level validation; consider structured columns if fields stabilize
- [ ] **File storage on local disk** — works for small scale; migrate to S3/R2 if volume grows
- [ ] **No file virus scanning** — uploaded files are stored as-is; add ClamAV or similar before production
- [ ] **Design review doc is markdown only** — team may want DOCX output; add pandoc conversion later
- [ ] **No rate limiting on intake endpoints** — add express-rate-limit for customer-facing routes
- [ ] **Customer session management** — customer JWT uses same secret/expiry as staff; may want shorter TTL
