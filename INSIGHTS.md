# Insight Report — Treasury Operations Hub
> Generated: 2026-04-09
> 18 findings across 10+ pages, focused on strategic value gaps and new issues

---

## 1. THE BIG ONE: Staffing and Status are two apps duct-taped into one sidebar

**High** · Architecture / Product Strategy

This is the single biggest thing holding the app back. You have two completely independent data models:
- **Staffing Projects** (resources, assignments, utilization)
- **Status Projects** (RAG, updates, phases, issues)

These don't share a foreign key. A PM looking at a "Status Project" detail page can't see who from the staffing module is assigned. A resource manager looking at utilization can't see if the project is At Risk. The "Staffing" tab on the Status Project detail page uses `assignmentsApi` and `resourcesApi`, which is a start — but the two "Projects" concepts are confusing to any new user.

**Why it matters:** An executive asks "why is this project At Risk?" and the answer is often "understaffed." Today that requires flipping between two separate modules and mentally joining the data. Linking these (even with a simple FK between StatusProject and staffing Project) would be transformative.

---

## 2. No trend over time — every view is a snapshot

**High** · Executive Value

The Exec Rollup, Status Dashboard, and Reports page all show current state. There's no historical dimension:
- How many projects were green last month vs. this month?
- Is the portfolio getting healthier or sicker?
- Which projects keep flip-flopping between green and yellow?

A **RAG trend sparkline** per project (or a stacked area chart on the dashboard showing green/yellow/red counts over time) would make this the page executives actually open every Monday morning.

---

## 3. No export or print view on the Executive Rollup

**High** · Executive Value

The Rollup is designed for leadership consumption, but there's no way to get it out of the browser. No PDF export, no print-friendly stylesheet, no "copy to clipboard" for pasting into an email. Executives don't bookmark internal tools — they forward things. A "Download PDF" or "Print View" button would dramatically increase the Rollup's reach.

---

## 4. Programs list has no aggregate status column

**Med** · Programs page

The Programs table shows Name, Description, and Project Count — but not the aggregate health. The Status Dashboard shows program cards with colored dots, but once you navigate to the Programs list page, that context vanishes. Add a STATUS column (worst-status-wins or a RAG distribution mini-bar) so the list view carries the same information density as the dashboard cards.

---

## 5. Program detail page is too thin

**Med** · Program Detail

The Program Detail page shows a description and a projects table. For something called a "Program" in a government context, this page should be a mini-dashboard:
- Aggregate RAG distribution (1 green, 2 yellow, 0 red)
- Latest accomplishments across child projects
- Open blockers count
- A mini-roadmap or phase timeline

Right now it's just a filtered Projects list with a header.

---

## 6. Status Dashboard stat cards look clickable but aren't

**Med** · Status Dashboard

The 5 stat cards (Total Projects, On Track, At Risk, Off Track, Overdue Updates) have card styling with borders and colored top bars — the same visual treatment as clickable cards on the Staffing Dashboard. But clicking "Off Track" doesn't filter the view to show only off-track projects. Each card should navigate to `/status/projects?status=red` (or equivalent filter).

---

## 7. Program Detail — overdue "Next Update Due" dates are not highlighted

**Med** · Program Detail

On the Program Detail page, "Awesome Project 3.14" shows Next Update Due as 2/14/2026 — nearly 2 months overdue — but it's styled identically to the on-time date. The Reports page correctly shows this in red with a warning icon. The treatment should be consistent everywhere dates appear.

---

## 8. Risks & Issues in the Rollup have no severity/category differentiation

**Med** · Executive Rollup

"And this is a blocker", "This is an issue!", and "This is a sample risk" are listed identically under "RISKS & ISSUES (3)". A blocker should look different from a general issue. Add a category chip (Blocker / Risk / Issue) with color coding so an executive scanning the page can immediately triage by severity.

---

## 9. Update form is too minimal

**Med** · Project Detail > Updates tab

The Add Status Update form only captures Status (dropdown) and Summary (textarea). Most project status tools also capture:
- **Risks / Blockers** (structured, not just prose)
- **Next Steps / Plan for next period**
- **Key Decisions needed**

The Issues tab exists separately, but the update workflow doesn't prompt the user to think about these dimensions. At minimum, add optional "Risks" and "Next Steps" fields to the update form so the Rollup has richer material to aggregate.

---

## 10. No notification bell or inbox

**Med** · App-wide

The Prisma schema has a `Notification` model with fields for update-due, update-overdue, and new-update events. But there's no notification icon in the header, no inbox page, and no way for users to see what needs their attention. This is modeled but invisible.

---

## 11. Reference Data subtitle is stale

**Low** · Reference Data page

The subtitle says "Manage roles, functional areas, and products" but the page now also manages Departments, Priorities, Execution Types, Customer Categories, and RAG Definitions. Update the subtitle to match reality, or simplify to "Manage reference data for the application."

---

## 12. Roadmap Gantt — short-duration phases are unreadable

**Low** · Roadmap page

"Matt's OTHER test project" has two phases that render as tiny colored slivers. The phase labels truncate to "M..." and "A..." — unreadable without hovering. For very short phases, either show a minimum width with an overflow tooltip, or stack the label above the bar.

---

## 13. Portfolio layer exists in the schema but is invisible in the UI

**Low** · Architecture

The data model supports Portfolio → Program → Project, but Portfolio has no management UI and no navigation entry. If this hierarchy matters (it usually does in government IT), surfacing it would give executives a top-level view above Programs. If it doesn't matter, remove it from the schema to avoid confusion.

---

## 14. Delete actions on Reference Data have no confirmation dialog

**Low** · Reference Data page

The red trash icon on each reference data row is a single-click delete with no "Are you sure?" confirmation. Deleting a Role that's assigned to 50 resources could cascade badly. Add a confirmation modal, at minimum for items with active references.

---

## 15. "Ending Within 30 Days" card on Staffing Dashboard has no detail view

**Low** · Staffing Dashboard

There's a yellow-topped card showing "1 Ending Within 30 Days" — presumably a contractor POP expiration. But clicking it doesn't navigate anywhere. This is exactly the kind of card that should link to a filtered view showing which contractors are about to roll off.

---

## 16. All project owners are "System Admin"

**Low** · Data quality

Every project shows "System Admin" as the owner. This suggests the Owner field is auto-populated from the logged-in user rather than being selectable from a team roster. For real use, this field should be a dropdown of known users or a free-text field so different PMs can be assigned.

---

## 17. No cross-link between Programs page and Roadmap

**Low** · Navigation

From the Programs list, there's no way to jump directly to the Roadmap filtered for that program. A "View Roadmap" link on the Program Detail page would create a natural drill-down flow: Programs → Program Detail → Roadmap (filtered).

---

## 18. Section header casing inconsistency on Rollup

**Low** · Executive Rollup

Section headers use ALL CAPS ("ACCOMPLISHMENTS (2)", "STATUS UPDATES (1)", "RISKS & ISSUES (3)") while the rest of the app uses Title Case. Normalize to match the app-wide convention.

---

## Quick Wins (< 30 min each)
- [x] Make Status Dashboard stat cards clickable (navigate to filtered Projects list)
- [x] ~~Add confirmation dialog to Reference Data delete buttons~~ (already implemented with usage-aware modal)
- [x] Update Reference Data subtitle to reflect all managed entities
- [x] Add category badges (Blocker/Risk/Issue) to Rollup risk entries
- [x] Normalize Rollup section headers to Title Case
- [x] Highlight overdue dates consistently on Program Detail (match Reports page styling)
- [x] Add "View Roadmap" link on Program Detail page

## High-Impact Strategic Work
- **Link Staffing and Status projects** — even a simple FK would unlock cross-module insights
- **Add historical RAG trend tracking** — store snapshots, show sparklines
- **Add export/print to Executive Rollup** — PDF or print stylesheet
- **Enrich the Update form** — add Risks, Next Steps, Decisions fields
- **Build the notification inbox** — the model exists, surface it
