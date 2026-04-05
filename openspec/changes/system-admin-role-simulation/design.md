# Design: system-admin-role-simulation

## Technical Approach

Adopt **real actor scope + simulated effective role**. The real actor keeps their actual dataset boundaries (memberships and real assignments). Simulation only changes authorization semantics inside that real scope: permissions, visible navigation, enabled actions, and UI experience. No global company state returns to auth/header.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Scope model | `actorScope` is derived from the real user; `effectiveRole` is simulated or real | single blended `effectiveUser`; dataset filtered by simulated role | Separates tenancy/trazabilidad from UX simulation and matches the validated rule. |
| Backend authz | Guards resolve actor identity + explicit request scope; services receive both `actorScope` and `effectiveRole` | guard decides everything; services keep filtering by effective role | Keeps fail-closed tenancy in backend and avoids hidden cross-tenant widening. |
| Frontend session | Auth keeps `memberships`, `actorHasSystemAdminCapability`, `simulation`, `effectiveRole`; removes global `effectiveCompanyId/currentCompany` as ambient state | keep preferred company in auth | `/projects` and `/tickets` now own local company filters. |
| Migration path | Keep explicit `X-Company-Id` only for legacy company-scoped endpoints, but page/service-local | remove header and hope callers survive | Lets rollout happen without reopening global selector coupling. |

## Data Flow

`/auth/session` → `AuthProvider` stores actor identity, memberships, simulation, effectiveRole.

`/projects` or `/tickets` → local selector resolves `requestedCompanyIds` from query/UI → intersect with **real** membership scope → service fetches dataset within that intersection → UI gates actions/navigation using `effectiveRole`.

`JwtAuthGuard` → `AuthContextGuard` resolves actor + optional explicit company scope → domain service evaluates:
1. **actor real**: simulation eligibility, company access, assignment/resource scope, audit actor
2. **effectiveRole**: permission matrix, action availability, visible projections

## File Changes

| File | Action | Description |
|---|---|---|
| `aiderbrand-system/apps/api/src/common/types/auth-context.type.ts` | Modify | Add explicit `actorScope` summary and keep `effectiveRole` separate. |
| `aiderbrand-system/apps/api/src/common/guards/company-membership.guard.ts` | Modify | Resolve explicit company scope from request only; compute accessible scope from real memberships, never from simulated role alone. |
| `aiderbrand-system/apps/api/src/auth/auth.service.ts` + `dto/auth-response.dto.ts` | Modify | Session exposes role-only simulation; no global effective company. |
| `aiderbrand-system/apps/api/src/{companies,invitations,memberships}/*.controller.ts` | Modify | Pass `actorScope` + `effectiveRole` to services so legacy actions stop assuming role-derived dataset scope. |
| `aiderbrand-system/apps/web/contexts/auth-context.tsx` | Modify | Remove ambient company switching/state; keep role simulation and real memberships. |
| `aiderbrand-system/apps/web/lib/company-scope.ts` | Rewrite | Company options derive from real memberships/real scope, not `actorHasSystemAdminCapability` or `effectiveRole`. |
| `aiderbrand-system/apps/web/features/{projects,tickets}/hooks/*.ts` | Modify | Local company filters use real scope; actions/tabs/buttons use `effectiveRole`. |
| `aiderbrand-system/apps/web/lib/route-policy.ts`, `components/layout/{app-header,app-sidebar}.tsx`, `components/auth/auth-guard.tsx` | Modify | Sidebar/header/navigation reflect simulated role; route guard stops depending on removed global company state. |

## Interfaces / Contracts

```ts
interface ActorScopeSummary {
  membershipCompanyIds: string[]
}

interface AuthContextData {
  actorUserId: string
  actorHasSystemAdminCapability: boolean
  actorScope: ActorScopeSummary
  scopedCompanyId: string | null
  effectiveRole: Role | null
  realMembershipRole: Role | null
  simulation: AuthSimulationSummary | null
}
```

Rule: repositories/services must accept both contexts. Dataset predicates start from `actorScope` (and later domain assignment resolvers), then intersect local `companyId/companyIds` filters. `effectiveRole` may reduce visible fields/actions, but MUST NOT widen or shrink the underlying assigned dataset by itself.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | scope helpers, route-policy, company filter selectors | pure tests for actor-scope vs effective-role matrix |
| Integration | guard + service interplay for explicit company scope and simulation | Nest tests proving real actor scope wins over simulated role |
| Integration | projects/tickets hooks | React tests proving local filters come from memberships and sidebar/header from simulated role |

## Migration / Rollout

1. Refactor auth/session and guard contracts first.
2. Replace frontend ambient company state with local page filters.
3. Update `/projects` and `/tickets` mocks/services so scope comes from real memberships.
4. Keep legacy explicit `X-Company-Id` only on callers that truly need company-scoped endpoints until those domains get dedicated APIs.

## Open Questions

- [ ] `/projects` and `/tickets` still run on mock services; their future backend endpoints must preserve this same split when implemented.
