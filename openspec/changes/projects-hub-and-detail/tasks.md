# Tasks: Projects Hub and Operational Detail

## Phase 1: Foundation and tenant-safe contracts

- [x] 1.1 Audit and fix `apps/web/lib/services/project-service.ts` + `apps/web/features/projects/hooks/use-projects.ts` so detail always resolves by `companyId + projectId`; block cross-company reads before any UI rewrite.
- [x] 1.2 Extend `apps/web/lib/types/domain.ts` and `apps/web/features/projects/types.ts` with `ProjectAudience`, hub/workspace payloads, tab ids, health enums, and canonical project context types.
- [x] 1.3 Update `apps/web/lib/rbac.ts` with project-section capabilities (`projects:health`, `projects:internal_tasks`, `projects:internal_notes`, `projects:admin`) and helpers for shared vs internal tabs.
- [x] 1.4 Expand `apps/web/lib/mock/projects.ts` and add `apps/web/lib/mock/project-workspaces.ts` with phases, activity, internal tasks, notes, and admin fixtures split by audience.

## Phase 2: Data shaping and hooks

- [x] 2.1 Refactor `apps/web/lib/services/project-service.ts` to expose `getProjectsHub(companyId, role)` and `getProjectWorkspace(companyId, projectId, audience)` with canonical metadata and role-safe payload shaping.
- [x] 2.2 Split `apps/web/features/projects/hooks/use-projects.ts` into `useProjectsHub` and `useProjectWorkspace`, deriving filters, selected section, and empty-state context from one source.
- [x] 2.3 Create `apps/web/features/projects/lib/project-selectors.ts` for tab mapping, SLA health aggregation from internal tasks, and canonical metadata selectors that prevent duplicated summaries.

## Phase 3: `/projects` hub

- [x] 3.1 Replace `apps/web/app/(app)/projects/page.tsx` and `apps/web/features/projects/components/project-list-container.tsx` with a hub container that reads role/company context and owns filters/query params.
- [x] 3.2 Replace `apps/web/features/projects/components/project-list.tsx` with `projects-hub.tsx`, `projects-hub-filters.tsx`, and `projects-hub-summary.tsx` for search, status filters, summary cards, and resettable empty states.
- [x] 3.3 Add quick actions from each hub item to `/projects/[projectId]` default and section-targeted routes for tickets/phases without duplicating project metadata blocks.

## Phase 4: `/projects/[projectId]` shared workspace

- [x] 4.1 Replace `apps/web/app/(app)/projects/[projectId]/page.tsx` and `apps/web/features/projects/components/project-detail-container.tsx` with a workspace container that validates company access and persists the selected section.
- [x] 4.2 Replace `apps/web/features/projects/components/project-detail.tsx` with `project-workspace-header.tsx` and `project-section-tabs.tsx`, keeping one canonical header for name, company, status, phase, progress, and key dates.
- [x] 4.3 Create `project-overview-section.tsx`, `project-phases-section.tsx`, `project-tickets-section.tsx`, and `project-activity-section.tsx` with role-safe empty states and direct ticket navigation.

## Phase 5: Internal operational sections

- [x] 5.1 Create `project-internal-tasks-section.tsx` to list pending tasks by phase, assignee, priority, due state, and internal-only SLA health badge.
- [x] 5.2 Create `project-internal-notes-section.tsx` for the internal notes feed and `project-admin-section.tsx` for read-only V1 controls and ownership context.
- [x] 5.3 Enforce that clients never receive or render internal sections/fields, and that tickets vs tasks stay separated in labels, counts, and lists.

## Phase 6: Verification

- [x] 6.1 Add unit specs for `apps/web/features/projects/lib/project-selectors.ts` covering role matrix, canonical metadata reuse, and task-health aggregation.
- [x] 6.2 Add integration specs for `apps/web/lib/services/project-service.ts` and `apps/web/features/projects/hooks/use-projects.ts` covering tenant-safe detail access and client/internal payload separation.
- [x] 6.3 Add workspace navigation specs for `/projects` → `/projects/[projectId]` ensuring ACCOUNT_OWNER sees only shared tabs and PROJECT_LEAD also sees internal tabs; forbidden tabs must be absent, not hidden.
