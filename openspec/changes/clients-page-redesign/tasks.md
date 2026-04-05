# Tasks: Companies Page Redesign

## Phase 1: Infrastructure / Routing

- [x] 1.1 Update `aiderbrand-system/apps/web/lib/rbac.ts` to replace `nav:clients` with `nav:companies` + granular `companies:*`; map `SYSTEM_ADMIN` full access, `PROJECT_LEAD` to `view|update|invite|create-project|memberships:update`, and deny `DELIVERY_SPECIALIST|ACCOUNT_OWNER|COLLABORATOR`.
- [x] 1.2 Update `aiderbrand-system/apps/web/components/layout/sidebar-nav-items.ts` and `breadcrumb-nav.tsx` so visible IA uses `Companies` and `/companies` only.
- [x] 1.3 Create `aiderbrand-system/apps/web/app/(app)/companies/page.tsx` and `app/(app)/clients/page.tsx` redirect/compat entry; `/clients` MUST normalize to `/companies`.
- [x] 1.4 Add shared companies types/contracts in `aiderbrand-system/apps/web/lib/types/domain.ts` and `apps/api/src/companies/dto/**` before wiring UI or handlers.

## Phase 2: Backend

- [x] 2.1 Extend `apps/api/src/companies/companies.repository.ts|service.ts|controller.ts` with `GET /companies` supporting search, status, sort, page, and aggregates needed by the table; this blocks 3.3-3.5.
- [ ] 2.2 Add `GET /companies/:id` detail payload in `apps/api/src/companies/**` returning `{ company, members, invitations, projects, activity? }`; `activity` only for `SYSTEM_ADMIN`. Depends on 2.1.
- [x] 2.3 Add `PATCH /companies/:id` in `apps/api/src/companies/**` for `name` and `slug`; allow `SYSTEM_ADMIN` + `PROJECT_LEAD`, audit `company.updated`.
- [x] 2.4 Add `PATCH /companies/:id/status` in `apps/api/src/companies/**`; allow `SYSTEM_ADMIN` only, support only active/inactive, audit each change.
- [x] 2.5 Create company-scoped membership read/toggle contract in `apps/api/src/memberships/**` (list active/inactive, activate, deactivate); allow `SYSTEM_ADMIN` full and `PROJECT_LEAD` membership toggle if target role matrix permits; audit changes. Depends on 2.2.
- [x] 2.6 Adapt `apps/api/src/invitations/**` for company-scoped list/create/revoke from the hub, preserving duplicate-pending protection and existing invite-role matrix. Depends on 2.2.
- [ ] 2.7 Prerequisite: define minimal project backend contract in `apps/api/src/projects/**` plus persistence support if missing, so company detail can list linked projects, create project in company context, and admin-only link existing project. This blocks 2.2, 3.5, and 3.6.

## Phase 3: Frontend

- [x] 3.1 Create `aiderbrand-system/apps/web/lib/services/company-service.ts` and feature-local adapters/selectors under `apps/web/features/companies/**` consuming the contracts from 2.1-2.7.
- [x] 3.2 Create `apps/web/features/companies/hooks/use-companies-hub.ts` to normalize `q,status,sort,page,company,tab`, preserve valid URL state, and reject invalid params safely. Depends on 2.1.
- [x] 3.3 Build table-first hub components under `apps/web/features/companies/components/**`: header, summary strip, filters, data table, empty/error/loading states, and row action menu. Depends on 3.1-3.2.
- [ ] 3.4 Build contextual detail panel/sheet with local tabs `Overview|Members|Projects|Activity`; keep `Activity` admin-only and include “tickets are implicit” microcopy in `Projects`. Depends on 2.2, 2.5, 2.7.
- [ ] 3.5 Implement dialogs/confirmations for new company, edit company, invite member, membership activate/deactivate, create project, link existing project, and activate/deactivate company; disable unauthorized actions in UI only as affordance. Depends on 2.3-2.7.

## Phase 4: Tests / Verification

- [ ] 4.1 Add API coverage in `aiderbrand-system/apps/api/test/companies/**` and `test/memberships/**` for list/detail filters, `PROJECT_LEAD` name/slug edit, admin-only status/activity, membership toggle, invite duplicate rejection, and denied-role access.
- [ ] 4.2 Add web tests in `apps/web/features/companies/**/*.spec.tsx` and `apps/web/lib/services/company-service.spec.ts` for query normalization, RBAC action visibility, empty-state branching, detail-tab gating, and `/clients` redirect.
- [ ] 4.3 Verify end-to-end flow against spec scenarios: admin full CRUD + audit visibility, project-lead restricted flow, disallowed roles without nav/access, and no manual ticket-link UI.
