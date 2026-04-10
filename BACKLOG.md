# Treasury Capacity Management — Backlog

> Last updated: 2026-04-06

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

---

## 🔜 Backlog

### 🟢 Small (< 1 hour)

- [x] **Favicon** — replace default with U.S. Treasury favicon
- [x] **Resources — edit row icon** is white on white in light mode; use appropriate contrasting color
- [x] **Dashboard — "View All Resources" button** style should match "View All Projects" button
- [x] **Dashboard — Total Resources card** links to the Resources page
- [ ] **Dashboard — Available Resources card** links to the Resources page filtered to available-only
- [ ] **Dashboard — Division labels** show lowercase (e.g. "Pmso" → "PMSO"); capitalize correctly

### 🟡 Medium (1–4 hours)

- [ ] **Executive rollup report** — configurable time window (weekly/monthly/custom) that aggregates Accomplishments, Updates, Issues, Risks, and Blockers across all projects into a single executive-friendly view; filterable by program or portfolio; exportable
- [ ] **WYSIWYG editor for update text fields** — replace plain textareas in the Updates, Accomplishments, and Issues tabs with a rich text editor (bold, bullets, links); display rendered HTML in the log cards
- [ ] **Projects list page** — filterable table (status, priority, product)
- [ ] **Utilization calculation** — verify total % per resource sums correctly across assignments
- [ ] **Search** — global name search across resources and projects
- [ ] **Contractor POP dates** — fix date format variance so all rows parse correctly on import

### 🟠 Large (half day – full day)

- [ ] **Project detail page** — team roster with roles and utilization, add/remove members
- [ ] **Add / Edit Resource form** — all fields, role selector, supervisor lookup, division dropdown
- [ ] **Add / Edit Project form** — product selector, priority, dates, status
- [ ] **Import page UI** — drag-and-drop upload, preview before commit, validation errors
- [ ] **Re-import idempotency** — add upsert logic so re-importing doesn't require manual DB truncate
- [ ] **Some assignments missing** — role name mismatch on import; add fuzzy match or fallback

### 🔴 Extra Large (multi-day)

- [ ] **Reference data admin** — manage Roles, Functional Areas, Products in the UI
- [ ] **Bureaus reference data** — admin CRUD for Treasury Bureaus (IRS, OCC, FinCEN, etc.); link bureaus to projects, programs, and resources for filtering and reporting
- [ ] **Phases reference data** — admin CRUD for standard project phase definitions (e.g. Planning, Execution, Closeout); used as a picklist when adding phases to project roadmaps
- [ ] **Departments reference data** — admin CRUD for Departments; used as a picklist on projects and resources for filtering and reporting
- [ ] **User management page** — list users, change roles, activate/deactivate
- [ ] **Audit log viewer** — paginated table of all actions
- [ ] **Role-based access** — editors can update resources, viewers read-only

---

## 🔍 Insights — 2026-03-20

### 🎯 UX & Interaction
- [ ] **Dashboard — Stat cards not clickable** — all 4 cards (Total Resources, Active Projects, Avg Utilization, Available Resources) look interactive but go nowhere; link each to its respective filtered view
- [ ] **Resource Detail — No way to edit an assignment** — trash icon only; users must delete and re-add to change utilization %, role, or dates
- [ ] **Project Detail — No way to edit a team member assignment** — same as above; delete-only with no edit path
- [ ] **Add Resource Form — POP dates always visible** — POP Start/End fields show even when Type = Federal; hide them when Type = Federal, show when Type = Contractor
- [ ] **Resources List — "Add Resource" appears twice inconsistently** — once as a confusing text link above the table (looks like a label/filter), once in the sidebar; consolidate into a clear button in the filter bar matching the Projects page pattern
- [ ] **Resource Detail — Edit button has no visual treatment** — sits flush next to the name with no border or background; doesn't look like a button

### 📊 Data & Content
- [ ] **Dashboard — Avg Utilization has no context** — 70% means nothing without a target or color signal; add green/yellow/red threshold coloring (e.g. green <80%, yellow 80–95%, red >95%)
- [ ] **Projects List — Priority column is empty for 43 of 45 projects** — column takes up space and shows "-" almost everywhere; either prompt users to fill it in or hide the column until data exists
- [ ] **Resources List — "Available" definition is unclear** — someone at 80% utilized shows 0% available; the definition of available capacity needs to be visible to users
- [ ] **Project Detail — "Total FTE Allocation %" label is misleading** — 78% sounds like the project is 78% staffed, but it's the sum of individual allocations; rename to "Total Allocated FTEs" or show a clearer breakdown
- [ ] **Resource Detail — Assignment start/end dates all show "-"** — date data exists in the source Excel but isn't displaying; critical for contractors with hard end dates

### 🧭 Navigation
- [ ] **Add Resource Form — Back button has no destination label** — says "← Back" with no context; should say "← Back to Resources"
- [ ] **Resource Detail — Supervisor names are plain text, not links** — should navigate to that supervisor's own detail page when clicked
- [ ] **Projects List — Rows are clickable but have no hover affordance** — no cursor change, no hover highlight, no chevron; users won't know rows are interactive

### ♿ Accessibility
- [ ] **FED/CTR badges rely on color alone** — blue vs. orange as the only differentiator is a color vision risk; text label helps but color-first design needs review
- [ ] **Assignment delete icon has no label or tooltip** — screen readers and keyboard users get a red icon with no context; add aria-label and a visible tooltip ("Remove assignment")

### ✨ Polish
- [ ] **Dashboard — "1 resources" pluralization bug** — the PMSO division card reads "1 resources" instead of "1 resource"

---

## 🔍 Insights — 2026-03-21

### 🎯 UX & Interaction
- [ ] **Users — no way to deactivate a user** — Active column is plain text only; no toggle or button to cut access. High priority.
- [ ] **Users — no way to delete a user** — No delete option exists. Combined with no deactivation, once a user is created they can't be removed from the UI.
- [ ] **Add Resource form — Back button has no destination** — says "← Back" with no label; every other back button names its destination (e.g. "← Back to Resources").

### 📊 Data & Content
- [ ] **Audit Log — most actions not being logged** — only 1 entry exists despite heavy activity (imports, resource creates, assignment changes aren't appearing); audit events not being fired consistently.
- [ ] **Audit Log — Entity ID not actionable** — rows show a truncated UUID (e.g. `752d5dfd...`) instead of the name of what changed; should show entity name (e.g. "Project: AI Service Desk") and ideally link to the record.
- [ ] **Dashboard — "1 resources" pluralization bug** — PMSO division bar reads "1 resources" instead of "1 resource".
- [ ] **Project Detail — "Allocated FTEs" label still confusing** — 78% of *what*? FTEs implies headcount not a percentage; consider "78% avg allocation" or show a clearer breakdown.

### 🧭 Navigation
- [ ] **Mobile — sidebar doesn't collapse** — sidebar takes up ~65% of screen at 375px wide; app is completely unusable on phones or narrow tablets; needs a hamburger/collapse at small viewports.

### ✨ Polish
- [ ] **Resource Detail — Capacity card colors don't match scheme** — 100% utilization displays in blue; should be green to match the healthy=green color scheme used everywhere else.

---

## 🔍 Insight Review — 2026-04-08

### 🎯 UX & Interaction
- [ ] **Exec Rollup — No text truncation on long entries** — a single verbose accomplishment dominates the page; clamp to 2–3 lines with a "Show more" toggle
- [ ] **Exec Rollup — Risks & Issues entries have no category badge** — blockers, risks, and issues are mixed with no visual severity indicator; add a colored category chip (Blocker/Risk/Issue) to each entry
- [ ] **Exec Rollup — Activity sections not collapsible** — Accomplishments, Updates, and Risks & Issues sections grow unbounded; add collapse/expand to each section header
- [ ] **Status Dashboard — Program card status dot has no label** — yellow dot conveys status through color alone; add tooltip or text label
- [ ] **Reports — Table horizontally clipped** — "ISSUES" column header cut off at right edge; needs horizontal scroll or narrower columns

### 📊 Data & Content
- [ ] **Exec Rollup — Zero-count stat cards styled in error color** — "0 Off Track" in red looks alarming; zero counts should use neutral/positive styling
- [ ] **Projects List — Overdue "Next Update Due" not highlighted** — Awesome Project 3.14 shows 2/14/2026 (2 months overdue) without red styling, unlike the Reports page; inconsistent overdue treatment
- [ ] **Exec Rollup — No "as of" timestamp** — subtitle shows window range but not when the rollup was generated; executives forwarding this need to know data freshness

### 🧭 Navigation
- [ ] **Sidebar — Executive section has only one item** — a section with a single nav link ("Rollup") wastes vertical space; consider keeping under Status until there are 2+ items, or add a second exec-level page

### ♿ Accessibility
- [ ] **Exec Rollup — Trend arrows rely on color alone** — ↑→↓ arrows use green/gray/red without screen-reader-friendly labels; add `aria-label` (e.g. "Status improving")
- [ ] **Exec Rollup — Trend count colors may fail WCAG contrast** — light green (#b7e4c7) on dark navy program header is faint; verify contrast ratio

### ✨ Polish
- [ ] **Exec Rollup — Section headers use ALL CAPS** — "ACCOMPLISHMENTS (2)" doesn't match app-wide title case convention; normalize to title case
- [ ] **Program Detail — Test data typo** — "Thsi is a test propgram" visible in demo; fix if shown to stakeholders

---

## 💡 Ideas / Future

- [ ] Export to Excel (mirror of import)
- [ ] Capacity planning view — future availability by date range
- [ ] Email notifications for POP expiration (contractor end dates)
- [ ] Bulk assignment editor — assign multiple people to a project at once
