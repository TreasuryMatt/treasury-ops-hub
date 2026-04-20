# Intake System — Implementation Plan

> Created: 2026-04-16
> Branch: `intake`
> Status: Approved

---

## Overview

A full Intake lifecycle system inside Treasury Ops Hub. External "customers" submit detailed requests through an isolated portal (no Ops Hub chrome). AI assists at three points in the workflow. Intake Reviewers triage, score, and make determinations. Approved requests become Projects with a pre-filled Design Review document.

---

## Workflow

```
Customer fills out form ──► AI scores submission ──► Intake Reviewer reviews
        │                           │                         │
   AI Agent assists            Score visible              Determination:
   (coaching, clarifying)     to Reviewers only         Backlog / Denied / Approved
                                                              │
                                          ┌───────────────────┼────────────────┐
                                          │                   │                │
                                      Backlog            Denied            Approved
                                    (with notes)     (with reason)            │
                                                                     StatusProject created
                                                                     (status: Initiated)
                                                                              │
                                                                     AI generates Design
                                                                     Review doc (.md)
```

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Customer portal at `/intake/*`** outside `<AppLayout>` | Customers get zero Ops Hub access. Own layout with `.gov` banner, no sidebar, no header. |
| **`userType: staff \| customer`** on User model | Determines portal routing after CAIA login. Extends existing mock CAIA auth. |
| **`isIntakeReviewer: Boolean`** additive flag | Layers onto existing roles. An editor+reviewer or manager+reviewer both work. |
| **JSON `formData` blob in versioned table** | Form fields will evolve; JSON avoids constant migrations. Version table tracks all edits. |
| **Local file storage (`uploads/intake/`)** | Small scale for now. Path stored in `IntakeDocument` model. |
| **AI stubs with defined contracts** | Three endpoints return placeholders. Real AI wired in by swapping stub functions. |
| **`initiated` status on StatusProject** | New status value for auto-created projects. Distinct from gray/green/yellow/red. |

---

## Database Schema Changes

### Extend User model

```prisma
// Add to existing User model:
userType          UserType  @default(staff) @map("user_type")
isIntakeReviewer  Boolean   @default(false) @map("is_intake_reviewer")

// Add relations:
intakeSubmissions       IntakeSubmission[]
intakeDeterminations    IntakeSubmission[]  @relation("Determinations")
intakeVersionsCreated   IntakeSubmissionVersion[]
intakeDocumentsUploaded IntakeDocument[]
```

```prisma
enum UserType {
  staff
  customer
}
```

### New models

```prisma
model IntakeSubmission {
  id                String    @id @default(uuid())
  submitterId       String    @map("submitter_id")
  submitter         User      @relation(fields: [submitterId], references: [id])

  title             String
  status            IntakeStatus @default(draft)

  currentVersionId  String?   @unique @map("current_version_id")
  currentVersion    IntakeSubmissionVersion? @relation("CurrentVersion", fields: [currentVersionId], references: [id])

  // AI scoring (reviewer-only visibility)
  aiScore           Float?    @map("ai_score")
  aiScoreDetails    Json?     @map("ai_score_details")
  aiScoredAt        DateTime? @map("ai_scored_at")

  // Leadership determination
  determination       IntakeDetermination? @map("determination")
  determinationNotes  String?  @map("determination_notes")
  denialReason        String?  @map("denial_reason")
  determinedById      String?  @map("determined_by_id")
  determinedBy        User?    @relation("Determinations", fields: [determinedById], references: [id])
  determinedAt        DateTime? @map("determined_at")

  // Auto-created project link
  linkedProjectId   String?   @unique @map("linked_project_id")
  linkedProject     StatusProject? @relation(fields: [linkedProjectId], references: [id])

  // Design review doc
  designReviewMd          String?   @map("design_review_md")
  designReviewGeneratedAt DateTime? @map("design_review_generated_at")

  // Relations
  versions    IntakeSubmissionVersion[] @relation("AllVersions")
  documents   IntakeDocument[]

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("intake_submissions")
}

model IntakeSubmissionVersion {
  id              String   @id @default(uuid())
  submissionId    String   @map("submission_id")
  submission      IntakeSubmission @relation("AllVersions", fields: [submissionId], references: [id])

  versionNumber   Int      @map("version_number")
  formData        Json     @map("form_data")

  createdAt       DateTime @default(now()) @map("created_at")
  createdById     String   @map("created_by_id")
  createdBy       User     @relation(fields: [createdById], references: [id])

  currentForSubmission IntakeSubmission? @relation("CurrentVersion")

  @@unique([submissionId, versionNumber])
  @@map("intake_submission_versions")
}

model IntakeDocument {
  id            String   @id @default(uuid())
  submissionId  String   @map("submission_id")
  submission    IntakeSubmission @relation(fields: [submissionId], references: [id])

  filename      String
  originalName  String   @map("original_name")
  mimeType      String   @map("mime_type")
  sizeBytes     Int      @map("size_bytes")
  storagePath   String   @map("storage_path")

  uploadedById  String   @map("uploaded_by_id")
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])
  uploadedAt    DateTime @default(now()) @map("uploaded_at")

  @@map("intake_documents")
}
```

### New enums

```prisma
enum IntakeStatus {
  draft
  submitted
  under_review
  backlog
  denied
  approved
}

enum IntakeDetermination {
  backlog
  denied
  approved
}
```

### Extend StatusProjectStatus

```prisma
enum StatusProjectStatus {
  initiated    // NEW — auto-created from approved intake
  green
  yellow
  red
  gray
}
```

### Extend StatusProject

Add reverse relation from `IntakeSubmission.linkedProjectId`.

---

## Backend Routes

### New file: `server/src/routes/intake.ts`

#### Customer endpoints (requires auth, own submissions only)

| Method | Path | Description |
|---|---|---|
| POST | `/api/intake/submissions` | Create draft submission |
| GET | `/api/intake/submissions/mine` | List own submissions |
| GET | `/api/intake/submissions/:id` | Get submission (own or reviewer) |
| PUT | `/api/intake/submissions/:id` | Update draft (creates new version) |
| POST | `/api/intake/submissions/:id/submit` | Finalize draft → submitted |
| GET | `/api/intake/submissions/:id/versions` | List version history |
| GET | `/api/intake/submissions/:id/versions/:versionId` | Get specific version |
| POST | `/api/intake/submissions/:id/documents` | Upload file (multer) |
| GET | `/api/intake/submissions/:id/documents/:docId/download` | Download file |
| DELETE | `/api/intake/submissions/:id/documents/:docId` | Delete file |

#### Reviewer endpoints (requires `isIntakeReviewer` or admin)

| Method | Path | Description |
|---|---|---|
| GET | `/api/intake/submissions` | List all submissions (paginated, filterable) |
| GET | `/api/intake/dashboard/stats` | Aggregate stats for reviewer dashboard |
| POST | `/api/intake/submissions/:id/score` | Trigger AI score (stub) |
| PUT | `/api/intake/submissions/:id/determination` | Set determination + auto-create project if approved |
| POST | `/api/intake/submissions/:id/design-review` | Generate design review doc (stub) |
| GET | `/api/intake/submissions/:id/design-review/download` | Download generated markdown |

#### AI stub endpoints

| Method | Path | Input | Output |
|---|---|---|---|
| POST | `/api/intake/ai/assist` | `{ formData, userMessage }` | `{ reply, suggestions: [{ field, suggestion }] }` |
| POST | `/api/intake/ai/score` | `{ formData, documents }` | `{ score, breakdown: [{ criterion, score, rationale }] }` |
| POST | `/api/intake/ai/design-review` | `{ formData, documents }` | `{ markdown }` |

### New middleware

- `requireIntakeReviewer` — checks `user.isIntakeReviewer === true || user.role === 'admin'`
- `requireSubmissionAccess` — checks user is submitter OR reviewer/admin

### File upload

- Middleware: `multer` with disk storage to `uploads/intake/<submissionId>/`
- Max file size: 25MB (configurable)
- Allowed types: PDF, DOCX, XLSX, PNG, JPG, TXT, CSV

---

## Frontend

### Customer Portal (`/intake/*`) — outside AppLayout

**Layout:** `CustomerLayout` component
- `.gov` banner (reuse `GovBanner`)
- Minimal header (no nav, no bell, just "Treasury Ops Hub — Intake Portal" + logout)
- No sidebar
- Full-width content area

**Routes:**

| Path | Component | Description |
|---|---|---|
| `/intake/login` | `CustomerLogin` | CAIA login (variant of existing Login page) |
| `/intake` | `CustomerDashboard` | List of own submissions with status badges |
| `/intake/submissions/new` | `IntakeForm` | Multi-step intake form with AI chat panel |
| `/intake/submissions/:id` | `CustomerSubmissionDetail` | View/edit submission, version history, status, determination |

**AI Chat Widget:** Floating side panel on the intake form. Sends draft `formData` + user message to `/api/intake/ai/assist`. Displays coaching suggestions. Stub UI renders a chat interface that returns a placeholder message.

### Staff Portal (inside AppLayout)

**Sidebar addition:** New "Intake" section between existing sections, visible when `user.isIntakeReviewer || user.role === 'admin'`:
```
Intake
  Dashboard
  Submissions
```

**Routes (inside AppLayout):**

| Path | Component | Description |
|---|---|---|
| `/intake-admin/dashboard` | `IntakeReviewerDashboard` | Stats cards, submission queue, status breakdown chart |
| `/intake-admin/submissions` | `IntakeSubmissionsList` | Filterable table of all submissions |
| `/intake-admin/submissions/:id` | `IntakeSubmissionReview` | Detail view: form data, AI score, determination form, version history, documents, design review trigger |

### Admin Users page extension

- Add `isIntakeReviewer` toggle (checkbox) on user edit
- Display `userType` column (staff / customer)
- Allow creating customer users or toggling `userType`

---

## Intake Form Fields

> **BLOCKED:** Awaiting customer's existing form example upload. Placeholder structure below — will be refined.

Expected field categories based on the workflow description:
- **Project/Request Name** (text)
- **Business Unit / Organization** (text)
- **Problem Statement** (rich text)
- **Business Goals** (rich text)
- **Proposed Solution** (rich text, optional)
- **Expected Cost Savings / ROI** (rich text + dollar amount)
- **Priority / Urgency** (select: Critical, High, Medium, Low)
- **Technical Requirements** (rich text)
- **Data Sensitivity / Security Classification** (select)
- **Key Stakeholders** (text, repeatable)
- **Desired Timeline** (date range)
- **Supporting Documents** (file uploads)
- **Additional Notes** (rich text)

---

## AI Integration Stubs

### 1. Submission Assistant Agent

**Purpose:** Coaches the customer to write stronger submissions and clarifies requirements.

**Contract:**
```typescript
// POST /api/intake/ai/assist
interface AssistRequest {
  formData: Record<string, any>;  // current form state
  userMessage: string;            // what the user asked
}

interface AssistResponse {
  reply: string;                  // conversational response
  suggestions: Array<{
    field: string;                // which form field to improve
    suggestion: string;           // specific coaching tip
  }>;
}
```

**Stub behavior:** Returns `{ reply: "AI assistant is not yet configured.", suggestions: [] }`

### 2. Feasibility Scorer

**Purpose:** Evaluates submission quality/feasibility after submission. Score visible to reviewers only.

**Contract:**
```typescript
// POST /api/intake/ai/score
interface ScoreRequest {
  formData: Record<string, any>;
  documents: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
}

interface ScoreResponse {
  score: number;                  // 0-100
  breakdown: Array<{
    criterion: string;            // e.g. "Business justification"
    score: number;                // 0-100
    weight: number;               // 0-1
    rationale: string;            // explanation
  }>;
}
```

**Stub behavior:** Returns `{ score: 0, breakdown: [], note: "AI scoring not yet configured" }`

### 3. Design Review Document Generator

**Purpose:** Pre-fills the AI Engineering Team's Design Review document from intake data. Only for approved submissions.

**Contract:**
```typescript
// POST /api/intake/ai/design-review
interface DesignReviewRequest {
  formData: Record<string, any>;
  documents: Array<{ filename: string; content?: string }>;
}

interface DesignReviewResponse {
  markdown: string;               // Complete design review doc
}
```

**Stub behavior:** Returns a markdown template with fields populated from `formData` where possible (no AI needed for direct mappings), and `[TO BE DETERMINED]` placeholders for fields that require AI analysis.

**Design Review Template Sections** (from the team's checklist):
- Executive Summary (what, why, impact, timeline, risks)
- Background (current state, problems, justification)
- Goals (specific, measurable, non-goals)
- Solution Overview (high-level approach, architecture, components)
- Detailed Design (components, tech choices, data models, APIs)
- Implementation Plan (phases, timeline, team, dependencies)
- Resource Requirements (people, timeframes)
- Testing Strategy
- Deployment Strategy
- Operations (monitoring, alerting, logging)
- Risks (categorized, severity, mitigation)
- Alternatives Considered
- Critical Gaps
- Open Questions

**What can be pre-filled from intake form data (no AI):**
- Executive Summary: what (from title + problem statement), why (from business goals)
- Background: problems (from problem statement), justification (from cost savings/ROI)
- Goals: from business goals field
- Resource Requirements: from desired timeline + stakeholders

**What requires AI to fill:**
- Solution Overview, Detailed Design, Tech choices
- Implementation Plan phases and dependencies
- Testing, Deployment, Operations strategies
- Risk assessment
- Alternatives analysis

---

## Auto-Project Creation on Approval

When a reviewer sets determination to `approved`:

1. Server creates a new `StatusProject` with:
   - `name` from submission title
   - `status: 'initiated'`
   - `description` from problem statement
   - Program assignment TBD (reviewer may specify, or default program)
2. Server links `IntakeSubmission.linkedProjectId` to the new project
3. Server updates submission status to `approved`
4. Audit log entry created
5. (Future: notification sent to customer — stubbed)

---

## Customer Auth Flow

Extends existing CAIA mock login:

1. Customer navigates to `/intake/login`
2. Authenticates via CAIA/PIV (mock: enters CAIA ID like `CUST001`)
3. Server looks up user, checks `userType`
4. JWT issued (same as staff, includes `userType`)
5. Client redirects:
   - `userType === 'customer'` → `/intake`
   - `userType === 'staff'` → `/staffing/dashboard` (existing)
6. Customer routes check `userType === 'customer'` (or reviewer/admin for cross-access)

Mock customer test IDs to add: `CUST001`, `CUST002`

---

## Implementation Phases

### Phase 1 — Schema & Auth
1. Prisma schema additions (all new models + enums + User extensions)
2. Run migration
3. Extend CAIA mock to support `userType=customer`, add customer seed users
4. Add `requireIntakeReviewer` and `requireSubmissionAccess` middleware
5. Extend admin users API: `isIntakeReviewer` toggle, `userType` display

### Phase 2 — Core Backend
6. Intake CRUD routes (create, read, update, list own, list all)
7. Submission versioning (auto-create version on update)
8. File upload/download with multer
9. AI stub endpoints (all three)
10. Determination endpoint with auto-project creation
11. Design review doc stub (template pre-fill)

### Phase 3 — Customer Frontend
12. `CustomerLayout` component (stripped chrome)
13. Customer login page variant
14. Customer dashboard (own submissions list)
15. Multi-step intake form
16. Submission detail page with version history
17. AI chat widget stub UI

### Phase 4 — Reviewer Frontend
18. Sidebar "Intake" section (conditional on reviewer flag)
19. Reviewer dashboard (stats, queue)
20. Submissions list/table with filters
21. Submission review detail (score panel, determination form, design review)

### Phase 5 — Design Review Doc
22. Template pre-fill logic (map form fields → doc sections)
23. Markdown download endpoint + UI button

### Phase 6 — Polish & Backlog
24. Finalize INTAKE_BACKLOG.md with AI integration specs
25. End-to-end workflow testing
26. Admin user management UI updates

---

## Files to Create/Modify

### New files
- `server/src/routes/intake.ts`
- `server/src/routes/intakeAi.ts` (AI stubs, separated for easy swap)
- `server/src/middleware/intakeAuth.ts`
- `server/src/services/designReviewService.ts`
- `client/src/pages/intake/CustomerLayout.tsx`
- `client/src/pages/intake/CustomerLogin.tsx`
- `client/src/pages/intake/CustomerDashboard.tsx`
- `client/src/pages/intake/IntakeForm.tsx`
- `client/src/pages/intake/CustomerSubmissionDetail.tsx`
- `client/src/pages/intake/IntakeReviewerDashboard.tsx`
- `client/src/pages/intake/IntakeSubmissionsList.tsx`
- `client/src/pages/intake/IntakeSubmissionReview.tsx`
- `client/src/components/AiChatWidget.tsx`
- `client/src/api/intake.ts`
- `INTAKE_BACKLOG.md`

### Modified files
- `server/prisma/schema.prisma` — new models, enums, User extensions
- `server/src/routes/auth.ts` — customer mock IDs, userType in JWT
- `server/src/middleware/auth.ts` — new middleware exports
- `server/src/routes/admin.ts` — isIntakeReviewer toggle
- `client/src/App.tsx` — new route groups
- `client/src/components/Sidebar.tsx` — Intake section
- `client/src/components/AppLayout.tsx` — no changes to layout, just route additions
- `client/src/context/AuthContext.tsx` — userType in user object
- `client/src/types/index.ts` — new types
- `client/src/pages/admin/Users.tsx` — reviewer toggle column
