# Treasury Capacity Management — Backlog

> Last updated: 2026-03-20

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

---

## 🔜 Backlog

### 🟢 Small (< 1 hour)

- [ ] **Favicon** — replace default with U.S. Treasury favicon
- [ ] **Resources — edit row icon** is white on white in light mode; use appropriate contrasting color
- [ ] **Dashboard — "View All Resources" button** style should match "View All Projects" button
- [ ] **Dashboard — Total Resources card** links to the Resources page
- [ ] **Dashboard — Available Resources card** links to the Resources page filtered to available-only
- [ ] **Dashboard — Division labels** show lowercase (e.g. "Pmso" → "PMSO"); capitalize correctly

### 🟡 Medium (1–4 hours)

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

## 💡 Ideas / Future

- [ ] Export to Excel (mirror of import)
- [ ] Capacity planning view — future availability by date range
- [ ] Email notifications for POP expiration (contractor end dates)
- [ ] Bulk assignment editor — assign multiple people to a project at once
