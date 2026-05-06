# Treasury Digital Operations Hub — Backlog

> Last updated: 2026-05-04

---

## ✅ Done

- [x] Project scaffold — Docker Compose, Dockerfiles, package.json, tsconfig
- [x] Prisma schema — Resource, Assignment, Project, Product, Role, FunctionalArea, User, AuditLog
- [x] Seed script — roles, functional areas, products, default admin user
- [x] Express server — auth, CRUD routes for resources, projects, assignments
- [x] React client — app shell, routing, auth context, USWDS styling, Treasury header/banner
- [x] Excel import — parse Federal Resources + Contractor Resources sheets into DB
- [x] Full data load — 152 resources (64 Fed / 88 CTR), 45 projects, 203 assignments
- [x] Resources list page — filterable/sortable table (division, functional area, type, role)
- [x] Resource detail page — profile card, supervisory chain, assignments with utilization, notes
- [x] Supervisor data model — isSupervisor flag, FK relations, dropdown on form, column on list
- [x] Resource Request form — all users can submit; editors approve/deny with review note; approval optionally assigns resource to project
- [x] Dashboard — Division labels capitalize correctly (PMSO, etc.) via `formatDivision()` utility
- [x] User management page — list users, edit roles, activate/deactivate
- [x] Audit log viewer — paginated table of all actions
- [x] Notification system — bell icon + dropdown, /notifications page, /settings/notifications preferences, popAlertJob cron, popAlertDaysBefore field on resource form, Notification + NotificationPreference schema
- [x] Issues page — full data model + CRUD (Issues list, IssueDetail with mitigation plan + comments, server routes, API client)
- [x] Escalate Risk → Issue workflow — "Escalate to Issue" button on RiskDetail; sets `progress = escalated_to_issue`, records `escalatedAt`; escalation banner on IssueDetail; block re-escalation

---

## 🔜 Backlog

### 🟢 Small (< 1 hour)

- [x] **Favicon** — replace default with U.S. Treasury favicon
- [x] **Resources — edit row icon** is white on white in light mode; use appropriate contrasting color
- [x] **Dashboard — "View All Resources" button** style should match "View All Projects" button
- [x] **Dashboard — Total Resources card** links to the Resources page
- [x] **Dashboard — Division labels** show lowercase (e.g. "Pmso" → "PMSO"); capitalize correctly

### 🟡 Medium (1–4 hours)

- [x] **Resource create — duplicate name/email warning** — when an admin fills in First Name + Last Name (or selects a linked user), check against existing active resources and users for a likely duplicate before saving. Approach: debounced `GET /api/resources?search=<firstName+lastName>` on blur of the Last Name field; if results come back, show an inline warning banner ("A resource named Jane Smith already exists — are you sure?") with a link to the existing record. Also check the selected linked user's email against existing `resource.user.email` values. The warning should be advisory only (not block submission) since legitimate duplicates exist (e.g. two people named John Smith). Server-side, the POST route should return a clear 409 if a unique constraint fires rather than a generic 400.
- [x] **WYSIWYG editor for update text fields** — replace plain textareas in the Updates, Accomplishments, and Issues tabs with a rich text editor (bold, bullets, links); display rendered HTML in the log cards

### 🟠 Large (half day – full day)

- [ ] **Import page UI** — drag-and-drop upload, preview before commit, validation errors
- [ ] **Re-import idempotency** — add upsert logic so re-importing doesn't require manual DB truncate

### 🔴 Extra Large (multi-day)

- [ ] **Bureaus reference data** — admin CRUD for Treasury Bureaus (IRS, OCC, FinCEN, etc.); link bureaus to projects, programs, and resources for filtering and reporting
- [ ] **Departments reference data** — admin CRUD for Departments; used as a picklist on projects and resources for filtering and reporting
- [x] **User management page** — list users, change roles, activate/deactivate
- [x] **Audit log viewer** — paginated table of all actions
- [ ] **Role-based access** — editors can update resources, viewers read-only
- [x] **Unified staff onboarding wizard (Option D)** — a single "Add Staff Member" form for admins that creates a `User` and `Resource` record in one transaction, pre-linked via `resource.userId`. Today these are created separately and linked after the fact via the Resource edit form (Option A). The wizard should: collect login fields (CAIA ID, email, display name, role, user type) alongside resource fields (type, division, functional area, role, supervisor, etc.) in a stepped or two-column layout; POST to a new server endpoint `POST /api/admin/onboard-staff` that wraps both creates in a Prisma `$transaction`; redirect to the new Resource detail page on success. Useful when onboarding federal employees who always need both an app login and a staffing record. Contractors (who may not log in) can continue to be created as Resource-only via the existing form. Also added: "Linked Resource" column on the Users page with link/unlink modal to retroactively connect existing users to existing resources.

---

## 🔍 Insights — 2026-03-20

### 📊 Data & Content
- [x] **Projects List — Priority column is empty for 43 of 45 projects** — column takes up space and shows "-" almost everywhere; either prompt users to fill it in or hide the column until data exists
- [ ] **Resources List — "Available" definition is unclear** — someone at 80% utilized shows 0% available; the definition of available capacity needs to be visible to users
- [x] **Project Detail — "Total FTE Allocation %" label is misleading** — 78% sounds like the project is 78% staffed, but it's the sum of individual allocations; rename to "Total Allocated FTEs" or show a clearer breakdown

### 🧭 Navigation
- [x] **Resource Detail — Supervisor names are plain text, not links** — should navigate to that supervisor's own detail page when clicked
- [ ] **Projects List — Rows are clickable but have no hover affordance** — no cursor change, no hover highlight, no chevron; users won't know rows are interactive

### ✨ Polish
- [x] **Dashboard — "1 resources" pluralization bug** — the PMSO division card reads "1 resources" instead of "1 resource"

---

## 🔍 Insights — 2026-03-21

### 🎯 UX & Interaction
- [x] **Users — no way to deactivate a user** — Deactivate button + confirmation dialog implemented in Users.tsx.
- [x] **Add Resource form — Back button has no destination** — says "← Back" with no label; every other back button names its destination (e.g. "← Back to Resources").

### 📊 Data & Content
- [ ] **Audit Log — most actions not being logged** — only 1 entry exists despite heavy activity (imports, resource creates, assignment changes aren't appearing); audit events not being fired consistently.
- [ ] **Audit Log — Entity ID not actionable** — rows show a truncated UUID (e.g. `752d5dfd...`) instead of the name of what changed; should show entity name (e.g. "Project: AI Service Desk") and ideally link to the record.
- [x] **Dashboard — "1 resources" pluralization bug** — PMSO division bar reads "1 resources" instead of "1 resource".
- [ ] **Project Detail — "Allocated FTEs" label still confusing** — 78% of *what*? FTEs implies headcount not a percentage; consider "78% avg allocation" or show a clearer breakdown.

### 🧭 Navigation
- [ ] **Mobile — sidebar doesn't collapse** — sidebar takes up ~65% of screen at 375px wide; app is completely unusable on phones or narrow tablets; needs a hamburger/collapse at small viewports.

### ✨ Polish
- [x] **Resource Detail — Capacity card colors don't match scheme** — 100% utilization displays in blue; should be green to match the healthy=green color scheme used everywhere else.

---

## 🔍 Insight Review — 2026-04-08

### 🎯 UX & Interaction
- [ ] **Exec Rollup — No text truncation on long entries** — a single verbose accomplishment dominates the page; clamp to 2–3 lines with a "Show more" toggle
- [ ] **Reports — Table horizontally clipped** — "ISSUES" column header cut off at right edge; needs horizontal scroll or narrower columns

### 📊 Data & Content
- [ ] **Exec Rollup — Zero-count stat cards styled in error color** — "0 Off Track" in red looks alarming; zero counts should use neutral/positive styling

### ♿ Accessibility
- [ ] **Exec Rollup — Trend arrows rely on color alone** — ↑→↓ arrows use green/gray/red without screen-reader-friendly labels; add `aria-label` (e.g. "Status improving")
- [ ] **Exec Rollup — Trend count colors may fail WCAG contrast** — light green (#b7e4c7) on dark navy program header is faint; verify contrast ratio

### ✨ Polish
- [ ] **Exec Rollup — Section headers use ALL CAPS** — "ACCOMPLISHMENTS (2)" doesn't match app-wide title case convention; normalize to title case
- [ ] **Program Detail — Test data typo** — "Thsi is a test propgram" visible in demo; fix if shown to stakeholders

---

---

## 🗂️ Risks & Issues Module — 2026-04-29

### 🔴 Extra Large (multi-day)

- [ ] **Risk approval workflow + Risk Approver role** — Add `isRiskApprover` boolean to the `User` model (new checkbox in the Users admin page). New Risks start with status `Pending` and are visible as such in the Risks list. Only Risk Approvers can transition a Risk from `Pending` → `Open` or `Pending` / `Open` → `Archived`. All other users can create risks but cannot approve them. Update Risks list to surface pending risks clearly (e.g. badge or row highlight).

- [ ] **Risk Manager role** — Add `isRiskManager` boolean to the `User` model (new checkbox in Users admin page). Risk Managers can fully create, edit, delete, and manage all Risks and Issues across the app — similar to an admin but scoped to the R&I module. Wire permission checks throughout `Risks.tsx`, `RiskDetail.tsx`, `Issues.tsx`, and `IssueDetail.tsx`.

- [ ] **Risks & Issues tab on Project detail** — Remove the old project-scoped Issues functionality from the Project detail page (the pre-standalone-module scaffolding); do not leave stale routes, API calls, or types behind. Replace with a unified "Risks & Issues" tab that queries the standalone Risks and Issues records filtered to the selected project.

- [ ] **Convert to Issue — retain Risk with bidirectional link** — When a Risk is converted to an Issue (manually via the "Convert to Issue" button, or automatically), do not delete or hide the Risk. Instead mark the Risk's status as `Converted to Issue`. Auto-generate a relative link on the Risk detail page pointing to the new Issue, and a matching relative link on the Issue detail page pointing back to the originating Risk. No absolute URLs — links must survive a domain/host migration.

### 🟠 Large (half day – full day)

- [x] **Issues page — data model + full CRUD workflow** — Full implementation: `Issues.tsx` list with dashboard stats + filters, `IssueDetail.tsx` with mitigation plan + comments, `server/src/routes/issues.ts`, `client/src/api/issues.ts`. Issues are risks with `progress = escalated_to_issue`; no separate model needed.

- [x] **Escalate Risk → Issue workflow** — "Escalate to Issue" button on `RiskDetail` sets `progress = escalated_to_issue` and records `escalatedAt`; escalation banner in `IssueDetail`; button hidden once escalated.

### 🟡 Medium (1–4 hours)

- [x] **Probability calculation** — The `probability` field is stored as raw user input; nothing derives or validates it. Intent was to calculate probability from likelihood × exposure (or similar) and surface a computed `riskScore` (probability × impact) in the list and detail views. Remaining work: decide the formula; auto-derive `probability` in the form or on the server; optionally expose `riskScore` in `Risks.tsx` and `RiskDetail.tsx`.

- [x] **Risk status auto-derived from mitigation items** — A Risk's status should be computed automatically as the worst status among its Mitigation Items (On Track < At Risk < Off Track). If a Risk has no mitigation items, its status is `None` (displayed with a gray neutral chip). Risks with status `None` count toward the "Without a mitigation plan" stat card on the Risks main page.

- [x] **"Without a mitigation plan" card button** — The filter button on this stat card is broken (table filtering no longer works as expected). Replace or supplement with a modal/popup that lists all Risks whose status is `None` (no mitigation items). The existing table filter approach can be removed if it cannot be made reliable.

- [x] **Risk Owner / Program Owner field rename and split** — Rename the current "Risk Owner" field to "Program Owner" and keep it auto-populated from the selected Program (no change in data source). Add a new separate "Risk Owner" field that is a dropdown pulling from the Resources list. Update all forms, detail views, list columns, and server types accordingly.

- [x] **Mitigation Action Step owner** — Each mitigation action step can be assigned a "Step Owner" selected from Resources. Only the Risk Owner (the new Resource-based field from the Risk Owner / Program Owner split, not the Program Owner) or a Risk Manager can create, edit, or remove mitigation steps. Wire permission checks in `RiskDetail.tsx` and the relevant API routes.

- [x] **Closure criteria prompt after all steps complete** — When all mitigation action steps for a Risk are checked/complete, display a prompt below the steps list (e.g. "Have all of the Closure Criteria been met?") along with a green "Yes, set status to Mitigated" button. Clicking it sets the Risk's status to `Mitigated`.

- [x] **Mitigation item status pill text** — Change the status pill labels on mitigation items to match the project status convention: `On Track`, `At Risk`, `Off Track` (title case, same wording).

- [x] **Remove old project-scoped Issues from Status module** — The Status module contains project-attached risk/issue scaffolding that predates the standalone Risks & Issues module. Locate and remove risk/issue fields, components, and routes scoped to a project in the Status module. Confirm no Status views reference the old model before deleting; regression-check the Status page.

### 🟢 Small (< 1 hour)

- [x] **Remove ID column from Risks and Issues tables** — The ID column in the `Risks.tsx` list table and the `Issues.tsx` list table should be removed; it is internal data that adds no value to users.

- [x] **Risk status column on Risks list and Risk Detail** — Add a Status column to the `Risks.tsx` table showing the auto-derived status as a colored chip (green = On Track, yellow = At Risk, red = Off Track, gray = None). Also display the same chip prominently on the `RiskDetail.tsx` page.

- [x] **"Convert to Issue" rename** — Rename all instances of "Escalate to Issue" to "Convert to Issue" throughout the UI and codebase (button labels, banners, comments, type strings). This is the canonical term going forward.

- [x] **Auto-fill Date Identified from creation date** — When creating a new Risk, the "Date Identified" field should be pre-populated with today's date. The user can override it, but it should never be blank on a new record.

---

## 💡 Ideas / Future

- [ ] Export to Excel (mirror of import)
- [ ] Capacity planning view — future availability by date range
- [ ] Bulk assignment editor — assign multiple people to a project at once

---

## ✅ Notification System — 2026-04-10 (implemented)

> Planned for implementation week of 2026-04-14. All phases complete as of 2026-04-29 audit.

### Decision Summary

| Dimension | Decision |
|---|---|
| Channels | In-app (bell + full page) + Email |
| Email provider | Provider-agnostic service layer (swappable) |
| Timing | Real-time |
| Preferences | Simple on/off per event type (v1); per-channel × per-event matrix (v2) |
| Priority levels | None — flat |
| History retention | Indefinite |
| PoP lead time | Configurable per contractor record |

---

### Trigger Events

| Event | Who gets notified |
|---|---|
| Contractor PoP ending (configurable lead time per record) | Configurable; likely manager/supervisor |
| Resource assigned to project | The resource themselves (email) |
| Resource removed from project | The resource themselves (email) |
| Issue created | Project stakeholders (per user prefs) |
| Issue resolved / reopened | Project stakeholders (per user prefs) |
| Project status change (e.g. moves to At Risk) | Project stakeholders (per user prefs) |
| @mention or new comment | Mentioned user |

---

### Architecture Plan

#### 1. Database — `Notification` table (Prisma)
```
Notification {
  id         String   @id @default(uuid())
  userId     String              // recipient
  type       String              // event type enum
  title      String
  body       String?
  linkUrl    String?             // deep link into app
  readAt     DateTime?           // null = unread
  createdAt  DateTime @default(now())
  user       User     @relation(...)
}
```

#### 2. Database — `NotificationPreference` table
```
NotificationPreference {
  id       String  @id @default(uuid())
  userId   String
  type     String  // event type
  inApp    Boolean @default(true)
  email    Boolean @default(true)
  user     User    @relation(...)
  @@unique([userId, type])
}
```

#### 3. Database — `ContractorPopAlert` field (extend Resource)
Add `popAlertDaysBefore Int?` to the `Resource` model. Null = system default (e.g. 30 days). Populated via the resource edit form.

#### 4. Server — Notification Service (`server/src/services/notificationService.ts`)
- `createNotification(userId, type, title, body, linkUrl)` — writes DB row
- `sendEmail(to, subject, html)` — thin wrapper; swap provider by changing one file
- `notifyUser(userId, type, payload)` — checks prefs, calls createNotification + sendEmail as appropriate
- Individual helper functions: `notifyAssigned`, `notifyRemoved`, `notifyIssueCreated`, etc.

#### 5. Server — PoP cron job (`server/src/jobs/popAlertJob.ts`)
- Run nightly via `node-cron` (already in Docker)
- Query all contractor resources where `popEndDate` is within `popAlertDaysBefore` days
- Deduplicate: don't re-fire if a notification of that type was already sent within the last 7 days
- Call `notifyUser` for each match

#### 6. API Routes
- `GET /api/notifications` — paginated list for current user (unread first)
- `PATCH /api/notifications/:id/read` — mark single read
- `PATCH /api/notifications/read-all` — mark all read
- `GET /api/notifications/preferences` — fetch user prefs
- `PUT /api/notifications/preferences` — update user prefs (array of `{type, inApp, email}`)

#### 7. UI — Bell Icon (Header)
- Badge showing unread count (hidden when 0)
- Dropdown panel: last 5–8 notifications, "Mark all read" button, "View all →" link
- Poll every 30s or use a simple long-poll (WebSockets are v2)

#### 8. UI — `/notifications` Full Page
- Full history, indefinite
- "Mark all read" button
- Filter: All / Unread
- Each row: icon, title, body preview, timestamp, deep link

#### 9. UI — Notification Preferences (`/settings/notifications`)
- Table of event types with In-App and Email toggles
- Save via `PUT /api/notifications/preferences`

#### 10. UI — Resource Edit Form
- Add `Alert lead time (days)` field for contractor records
- Only shown when Type = Contractor

---

### Build Order

1. **Prisma schema** — add `Notification`, `NotificationPreference`, `popAlertDaysBefore`
2. **Notification service** — `notifyUser`, `sendEmail` stub, helpers
3. **API routes** — CRUD for notifications + preferences
4. **Wire triggers** — call `notifyUser` in existing issue/project/assignment routes
5. **PoP cron job**
6. **UI — bell + dropdown**
7. **UI — /notifications page**
8. **UI — /settings/notifications preferences**
9. **UI — resource form pop alert field**
10. **Email provider** — plug in real provider (Resend recommended for DX) behind the service abstraction

---

### Sizing

| Phase | Effort |
|---|---|
| Schema + service + API (steps 1–4) | ~4 hours |
| PoP cron job (step 5) | ~1 hour |
| Bell + full page UI (steps 6–7) | ~4 hours |
| Preferences UI + resource form field (steps 8–9) | ~2 hours |
| Email wiring (step 10) | ~1 hour |
| **Total** | **~half-day to full day** |
