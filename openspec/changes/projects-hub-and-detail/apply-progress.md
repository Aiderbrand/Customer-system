# Apply Progress: projects-hub-and-detail

## Batch

- Phase 6 — runtime evidence para cerrar verify gap
- Completed in this batch: 6.1, 6.2, 6.3
- Verify follow-up — payload shaping, workspace alignment y copy final
- Completed in this batch: 4.1 + cierre de hallazgos estáticos de verify
- Phase 5 — secciones operativas internas y semántica task/pedido
- Completed in this batch: 5.1, 5.2, 5.3

## What changed

- Added a minimal `apps/web` test runner with Vitest + Testing Library, plus `vitest.config.ts`, `vitest.setup.ts` and the `npm test` script so the web workspace now has executable runtime evidence.
- Added unit specs for `project-selectors` covering role-aware tabs, forbidden-tab fallback, canonical metadata cloning, and SLA health aggregation.
- Added integration specs for `project-service` and `use-projects` covering hub filtering, tenant-safe workspace access, client/internal payload separation, and collaborator-only pedidos.
- Added runtime component specs for `/projects` and the shared workspace to prove the hub is tabular/listable, tickets stay embedded from the ticket module, internal tabs stay absent for clients, and fases remain collapsible/operable.
- Moved collaborator task restriction from UI-only filtering into `projectService.getProjectWorkspace(...)`, so the payload for `COLLABORATOR` now arrives already scoped to the assignee instead of relying on frontend selectors.
- Aligned the workspace naming with the spec by renaming the detail container/page exports to `ProjectWorkspace*`, preserving company access validation and section persistence in the same container flow.
- Replaced implementation-oriented product copy in the workspace admin/edit surfaces and removed console-only "Nuevo proyecto" actions from the hub views.
- Enriched canonical project context with `companyName` so the workspace header shows the company label instead of the raw `companyId`.
- Reworked `Fases` into a collapsible workspace where internal roles can operar cada fase con checklist rápido, bloqueos, dependencias y cierre propio; clientes reciben la misma entidad `Task` renderizada como `pedido` sin controles internos.
- Added `project-internal-tasks-section.tsx` with grouped operational tables by phase, checklist visibility, due-state signals and quick actions for bloquear, dependencia, no corresponde y done propio.
- Added `project-internal-notes-section.tsx` to centralize internal notes with alta local en mock, soportando notas globales y por fase desde una sola vista.
- Replaced the old administrative panel semantics with a clearer `Vista general` section and enabled local project editing for `SYSTEM_ADMIN` / `PROJECT_LEAD` when the mock workspace is dependency-ready.
- Extended the mock workspace contract with shared role-aware `tasks`, completion semantics (`done` vs `not_applicable`) and dependency-ready metadata, keeping tickets separate from tasks in payload, labels and sections.

## Verification

- `npm test` (in `aiderbrand-system/apps/web`) ✅ 17 tests passing
- `npm run typecheck` (in `aiderbrand-system/apps/web`) ⚠️ blocked by pre-existing syntax errors in `features/tickets/components/ticket-detail.tsx`

## Notes

- The new web tests intentionally stay close to current hooks/services/components instead of introducing browser E2E or build-time tooling, so verify can prove the spec-critical flows without expanding scope.
- `npm run typecheck` is currently not a reliable gate for this batch because `apps/web/features/tickets/components/ticket-detail.tsx` already contains unrelated JSX syntax issues outside Projects.
- Project editing, note creation and task quick actions remain local to the workspace container until real persistence exists.
- `Administración` remains the route/tab id for compatibility, but the UI communicates it as `Vista general` to absorb the previous panel into a clearer internal section.
- `ACCOUNT_OWNER` still sees all client-visible pedidos, while `COLLABORATOR` now receives only assigned pedidos directly from the service payload.

## Remaining next

- Re-run `sdd-verify` for `projects-hub-and-detail` with the new runtime evidence and decide whether to fix or waive the unrelated `ticket-detail.tsx` typecheck blocker.
