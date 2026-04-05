# Apply Progress: Companies Page Redesign

## Completed in this batch

- Backend `companies` now exposes an honest dedicated detail payload at `GET /companies/:companyId`, combining company data, memberships, invitations and admin-only activity from the real domain; project data remains explicitly unavailable because there is still no backend contract for it.
- Company creation is now a real admin-only flow end to end: frontend `companyService.createCompany` calls `POST /companies` without depending on header scope, the hub CTA is enabled only for the current RBAC, and successful creation navigates directly to the new company detail route.
- Frontend gained a dedicated route `app/(app)/companies/[companyId]/page.tsx`, a professional detail experience with `Overview`, `Members`, `Projects`, and admin-only `Activity`, plus working dialogs for create/edit/invite and confirmations for company status, invitation revoke, and membership activate/deactivate.
- The hub copy and operating surface were cleaned up: the low-value side panel was removed, table actions now open real flows, and visible copy no longer uses internal planning language.

## Intentionally left pending

- Linked projects, project creation, and project linking remain pending because `apps/api/src/projects/**` still does not exist and this batch intentionally did not fake that domain.
- The `Projects` tab on company detail is intentionally read-only and explanatory until the missing backend contract exists.
- Phase 4 coverage is still partial: this batch added targeted service/route tests, but the broader scenario matrix for full companies CRUD and UI flows remains pending.

## Verification

- `npm --prefix aiderbrand-system --workspace api run typecheck`
- `npm --prefix aiderbrand-system --workspace api test -- --runInBand test/companies/companies.service.spec.ts`
- `npm --prefix aiderbrand-system --workspace web test -- lib/services/company-service.spec.ts lib/route-policy.spec.ts`
- `npm --prefix aiderbrand-system --workspace web run typecheck` *(fails only on pre-existing `features/projects/**` errors listed below)*

## Blockers / risks

- The repo already has unrelated `apps/web` typecheck failures in existing `features/projects/components/project-detail-container.tsx` and `features/projects/components/projects-runtime.spec.tsx`; this batch did not touch those files.
- There is still no backend `projects` module/persistence to support honest company-linked project data, so project flows remain blocked by real domain work rather than UI wiring.
