# Tasks: System Admin Role Simulation

## Phase 1: Auth/session contract

- [ ] 1.1 Update `aiderbrand-system/apps/api/src/common/types/auth-context.type.ts`, `apps/api/src/auth/dto/auth-response.dto.ts`, and `apps/api/src/auth/auth.service.ts` to expose `actorScope`, `effectiveRole`, `simulation`, and real memberships without any ambient company state.
- [ ] 1.2 Adjust `aiderbrand-system/apps/api/src/auth/dto/start-role-simulation.dto.ts`, `auth.controller.ts`, `role-simulation.repository.ts`, and `auth.module.ts` so only real `SYSTEM_ADMIN` can start/stop simulation and selecting `SYSTEM_ADMIN` closes it.
- [ ] 1.3 Refactor `aiderbrand-system/apps/api/src/common/guards/company-membership.guard.ts` and `common/decorators/company-context.decorator.ts` to resolve explicit request company scope from the real actor scope, fail closed on ambiguity, and never derive dataset scope from `effectiveRole`.

## Phase 2: Backend separation, selectors, and audit

- [ ] 2.1 Update `aiderbrand-system/apps/api/src/{companies,invitations,memberships,auth}/**/*.controller.ts` and touched services so legacy company-scoped flows pass `actorScope` and `effectiveRole` separately instead of blending scope with simulated role.
- [ ] 2.2 Extend `aiderbrand-system/apps/api/src/audit/audit.service.ts` and simulation/auth callers to log actor identity, effective role, explicit scoped company, attempted unauthorized scope, outcome, and timestamp for start/stop and protected actions.
- [ ] 2.3 Rewrite `aiderbrand-system/apps/web/lib/company-scope.ts` plus any affected role/scope helpers so company options and resource filters come only from real memberships/assignments, while permission helpers still consume `effectiveRole`.

## Phase 3: Navigation and role-gated UI

- [ ] 3.1 Refactor `aiderbrand-system/apps/web/contexts/auth-context.tsx` and `lib/route-policy.ts` to keep actor scope/effective role split, remove global company assumptions, and preserve fail-closed route checks.
- [ ] 3.2 Update `aiderbrand-system/apps/web/components/layout/{app-header.tsx,app-sidebar.tsx,sidebar-nav-items.ts}` and `components/auth/auth-guard.tsx` so header/sidebar/navigation/actions reflect the simulated role while simulation controls remain visible only for real `SYSTEM_ADMIN`.

## Phase 4: `/projects` and `/tickets` local scope

- [ ] 4.1 Update `aiderbrand-system/apps/web/features/projects/{hooks/use-projects.ts,lib/project-selectors.ts,components/projects-hub*.tsx}` so datasets are filtered by real actor company scope, local filters intersect only authorized companies, and project actions/UI obey `effectiveRole`.
- [ ] 4.2 Update `aiderbrand-system/apps/web/features/tickets/{hooks/use-tickets.ts,components/ticket-list-container.tsx,components/ticket-filters.tsx}` with the same split: dataset from real scope, local company filter fail-closed, and role-gated UI from `effectiveRole`.

## Phase 5: Tests and verification

- [ ] 5.1 Refresh `aiderbrand-system/apps/api/test/auth/{auth-context.guard,roles.guard,auth.simulation.integration}.spec.ts`, `test/invitations/accept-invitation.spec.ts`, and `test/password-reset/password-reset.spec.ts` for actorScope vs effectiveRole, explicit company scope, unauthorized filter attempts, and audit assertions.
- [ ] 5.2 Refresh `aiderbrand-system/apps/web/contexts/auth-context.spec.tsx`, `components/layout/app-header.spec.tsx`, `features/projects/**/*spec.ts*`, and `features/tickets/components/ticket-filters.spec.tsx` to prove sidebar/header follow simulated role while `/projects` and `/tickets` keep the real dataset scope without any build step.
