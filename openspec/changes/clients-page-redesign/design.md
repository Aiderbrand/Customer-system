# Design: Companies Page Redesign

## Technical Approach
Implement `/companies` as an internal operations hub that reuses the existing `AppPageHeader + summary cards + Card-wrapped table` pattern from `features/projects`/`features/tickets`, but replaces the current dead `/clients` nav with a table-first screen plus contextual company detail. No full workspace route in v1: selection stays in the hub, while create/edit/invite/link actions happen in dialogs and confirmations. Legacy `/clients` redirects to `/companies`; visible naming is `Companies` everywhere.

## Architecture Decisions
| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Naming/routing | Canonical route `/companies`; `/clients` redirect only | Keep `/clients`; dual labels | Spec requires consistency; avoids mixed IA and future API drift. |
| Main layout | Single hub page + right detail panel on desktop, sheet on smaller widths | Full detail page; page tabs | Preserves scan speed and avoids workspace creep while still exposing members/projects/activity context. |
| Tabs | No top-level page tabs; detail tabs: `Overview`, `Members`, `Projects`, `Activity` | Tabs in the main page | The table is the product. Top-level tabs fragment focus; detail tabs localize secondary info. |
| Mutations | Dialog for create/edit/invite/link; confirm dialog for activate/deactivate/revoke | Inline row editing; full-page forms | Matches existing shadcn patterns, keeps context, and supports unsaved-changes guardrails. |
| Permissions/tenancy | Backend remains source of truth via `JwtAuthGuard -> AuthContextGuard -> RolesGuard`; frontend hides denied actions only as affordance | Frontend-only gating | Screen is internal-only and tenancy-sensitive; actions must stay server-enforced and auditable. |

## Data Flow
`CompaniesPage` → `CompaniesHubContainer` → `companiesService` → API (`/companies`, `/companies/:id/members`, `/companies/:id/projects`, `/companies/:id/activity`) → guards/auth context → service/repository → Prisma aggregates.

Selected row id, search, filters, sort, page, and detail tab live in URL params when feasible (`q`, `status`, `sort`, `page`, `company`, `tab`) so reload/back keeps operational context.

## Experience Architecture
- **Header**: title `Companies`, result badge, concise description, primary CTA `New company` only for `SYSTEM_ADMIN`.
- **Summary strip**: maximum 4 utilitarian cards: total, active, inactive, with pending invitations. No vanity KPIs.
- **Hub card**: search + filters toolbar above the main table.
- **Table columns**: `Company` (name + slug), `Status`, `Active members` *(derived from active memberships; backend aggregate required)*, `Pending invites` *(derived from invitations PENDING; backend aggregate required)*, `Projects` *(derived count; backend aggregate required)*, `Updated`, `Actions`.
- **Row actions**: `Open details`, `Edit`, `Invite member`, `Create project`, `Link existing project` (`SYSTEM_ADMIN` only), `Activate/Deactivate` (`SYSTEM_ADMIN` only), `View activity` (`SYSTEM_ADMIN` only).
- **Bulk actions**: none in v1; they increase audit/risk surface for status changes and linking without clear product need.
- **Filters with value**: search by `name|slug`; status `active/inactive`; optional chips `has pending invites`, `has projects` only if backend supports aggregates. No decorative filters.
- **Sorting**: name, status, updatedAt; aggregate-column sorting only if backend supports server sort.
- **States**: skeleton mirroring existing hubs; explicit error with retry; empty state split between “no companies yet” and “no results for current filters”.

## Key Flows
- **Create/Edit company**: modal form with only justified fields: `name`, optional `slug`; edit also exposes status read-only unless user is `SYSTEM_ADMIN`. Project Lead can edit, never create.
- **Members/Invitations**: detail tab shows active members first, pending invites second. Primary action `Invite member` opens modal with `email + role`; duplicate pending invitation returns inline API error. Revoke invitation is row-level, confirmed, and never mixed with member status editing unless backend contract exists.
- **Activity/Audit**: admin-only detail tab, compact reverse-chronological list with action label, actor, timestamp, and terse metadata; no analytics charts.
- **Projects**: detail tab shows linked projects table. CTAs: `Create project` (admin + lead) and `Link existing project` (admin only). Microcopy must state: “Tickets are not linked manually here; they remain implicit via company/project relation.”

## Premium UX Guardrails
- Do **not** show dashboards, revenue, owner CRM, health scores, or empty widgets.
- Use **table** for scan/operations, **panel tabs** for contextual detail, **cards** only for the 3–4 summary signals.
- Keep one vertical scroll per region; avoid nested long cards; actions stay near the entity they affect.

## Responsive
Desktop-first: two-pane hub on `xl+`; on smaller widths, row selection opens a right sheet. Table remains primary; detail never replaces the list route.

## File Changes
| File | Action | Description |
|---|---|---|
| `aiderbrand-system/apps/web/app/(app)/companies/page.tsx` | Create | Canonical page entry. |
| `aiderbrand-system/apps/web/app/(app)/clients/page.tsx` | Create/Modify | Redirect legacy route to `/companies`. |
| `aiderbrand-system/apps/web/features/companies/**` | Create | Hub container, table, detail panel, dialogs, filters, adapters. |
| `aiderbrand-system/apps/web/components/layout/sidebar-nav-items.ts` | Modify | Rename nav item to Companies and route `/companies`. |
| `aiderbrand-system/apps/web/components/layout/breadcrumb-nav.tsx` | Modify | Segment label `companies`. |
| `aiderbrand-system/apps/web/lib/rbac.ts` | Modify | Add granular companies permissions and remove broad `nav:clients` dependency from denied roles. |
| `aiderbrand-system/apps/api/src/companies/**` | Modify | List/update/status/detail endpoints and aggregates. |
| `aiderbrand-system/apps/api/src/invitations/**` / `memberships/**` | Modify | Company-scoped reads for detail tabs. |

## Interfaces / Contracts
Hub list item should extend current `Company` with optional aggregates: `{ activeMemberCount, pendingInvitationCount, linkedProjectCount, updatedAt, isActive }`. Detail payload should compose `{ company, members, invitations, projects, activity }` with `activity` returned only for `SYSTEM_ADMIN`.

## Testing Strategy
Unit: query-state normalization, RBAC action visibility, empty-state branching. Integration: modal flows, row-selection/detail sync, redirect `/clients`→`/companies`. E2E: admin full flow, project lead restricted flow, denied-role access rejection, audit-visible/admin-only behavior.

## Migration / Rollout
No data migration required. Rollout is routing/UI + backend contract expansion; keep temporary redirect from `/clients` to `/companies` until links are updated.

## Open Questions
- [ ] Confirm whether `PROJECT_LEAD` may edit slug or only name.
- [ ] Confirm whether membership deactivate/reactivate is in scope; current spec only mandates invitation visibility.
