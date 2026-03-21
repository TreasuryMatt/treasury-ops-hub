# Treasury Staffing — Backlog

> Last updated: 2026-03-20

---

## ✅ Done

- [x] Project scaffold — Docker Compose, Dockerfiles, package.json, tsconfig
- [x] Prisma schema — Resource, Assignment, Project, Product, Role, FunctionalArea, User, AuditLog
- [x] Seed script — roles, functional areas, products, default admin user
- [x] Express server — auth, CRUD routes for resources, projects, assignments
- [x] React client — app shell, routing, auth context, USWDS styling, Treasury header/banner
- [x] Excel import — parse Federal Resources + Contractor Resources sheets into DB
  - Fix: Federal Resources header at row 1 (title in row 0)
  - Fix: utilization column name typo
- [x] Full data load — 152 resources (64 Fed / 88 CTR), 45 projects, 203 assignments

---

## 🔜 Up Next

### High Priority
- [x] **Resources list page** — filterable/sortable table (division, functional area, type, role); sortable columns
- [x] **Resource detail page** — profile card, supervisory chain, assignments with utilization, notes
- [ ] **Projects list page** — filterable table (status, priority, product)
- [ ] **Project detail page** — team roster with roles and utilization, add/remove members

### Medium Priority
- [ ] **Add / Edit Resource form** — all fields, role selector, supervisor lookup, division dropdown
- [ ] **Add / Edit Project form** — product selector, priority, dates, status
- [ ] **Dashboard improvements** — scroll to over-capacity list, division breakdown shows correct labels (capitalize PMSO)
- [x] **Supervisor data model** — isSupervisor flag, FK relations, dropdown on form, column on list; 7 supervisors seeded from Excel
- [ ] **Utilization calculation** — verify total % per resource sums correctly across assignments

### Lower Priority
- [ ] **Import page UI** — drag-and-drop upload, preview before commit, validation error display
- [ ] **Reference data admin** — manage Roles, Functional Areas, Products in the UI
- [ ] **User management page** — list users, change roles, activate/deactivate
- [ ] **Audit log viewer** — paginated table of all actions
- [ ] **Search** — global name search across resources and projects

---

## 🐛 Known Issues / Polish

- [ ] Division labels show lowercase on dashboard (e.g. "Pmso" → "PMSO")
- [ ] Some assignments may be missing if role name didn't match seed data exactly
- [ ] Re-import currently requires manual DB truncate — add idempotent upsert logic
- [ ] Contractor POP dates not parsed for all rows (date format variance in Excel)

---

## 💡 Ideas / Future

- [ ] Export to Excel (mirror of import)
- [ ] Capacity planning view — future availability by date range
- [ ] Email notifications for POP expiration (contractor end dates)
- [ ] Role-based access — editors can update resources, viewers read-only
- [ ] Bulk assignment editor — assign multiple people to a project at once
