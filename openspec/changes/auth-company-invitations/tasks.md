# Tasks: auth-company-invitations

## Phase 1: Backend infrastructure

- [x] 1.1 Create `aiderbrand-system/apps/api/package.json`, `tsconfig*.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`; expose env/config skeleton. 
- [x] 1.2 Add `aiderbrand-system/apps/api/prisma/schema.prisma`, `.env.example`, and first migration for `User`, `Company`, `CompanyMembership`, `Invitation`, `PasswordResetToken`, `RefreshToken`, `AuditLog`. Depends on 1.1.
- [x] 1.3 Create `aiderbrand-system/apps/api/src/prisma/{prisma.module.ts,prisma.service.ts}` and seed script for initial `SYSTEM_ADMIN`. Depends on 1.2.

## Phase 2: Domain + multi-tenant foundations

- [x] 2.1 Add shared auth/domain enums and DTO primitives in `aiderbrand-system/apps/api/src/common/**`; include role, invitation status, token TTL config. Depends on 1.3.
- [x] 2.2 Implement `companies`, `memberships`, and `audit` repositories/services/modules under `aiderbrand-system/apps/api/src/**`; enforce UUID relations and audit write API. Depends on 2.1.
- [x] 2.3 Add `JwtAuthGuard`, `RolesGuard`, `CompanyMembershipGuard`, `@CurrentUser`, `@RequireRoles`, `@CompanyContext`, and exception/audit wiring in `aiderbrand-system/apps/api/src/common/**`. Depends on 2.2.

## Phase 3: Auth session flows

- [x] 3.1 Implement `aiderbrand-system/apps/api/src/auth/{auth.module.ts,auth.service.ts,strategies/*}` for bcrypt login, access JWT, hashed refresh tokens, logout/refresh. Depends on 2.3.
- [x] 3.2 Add `aiderbrand-system/apps/api/src/auth/auth.controller.ts` + DTOs for `POST /auth/login`, `/refresh`, `/logout`; set httpOnly refresh cookie and return memberships. Depends on 3.1.
- [x] 3.3 Add unit/integration tests for login success, invalid credentials, refresh rotation, and closed registration under `aiderbrand-system/apps/api/test/auth/**`. Depends on 3.2.

## Phase 4: Invitations

- [x] 4.1 Implement `aiderbrand-system/apps/api/src/invitations/{repository,service,module}.ts` with opaque token hashing, pending uniqueness, revoke/expire rules, and invite permission matrix. Depends on 2.3.
- [x] 4.2 Add `aiderbrand-system/apps/api/src/invitations/invitations.controller.ts` + DTOs for create, revoke, list, validate-token; require RBAC + `X-Company-Id`. Depends on 4.1.
- [x] 4.3 Extend `AuthService` + controller for `POST /auth/accept-invitation` transaction: create/update user, add membership, accept invitation, auto-login. Depends on 4.2 and 3.2.
- [x] 4.4 Add tests for forbidden role invites, valid acceptance, expired/revoked token, and existing-user membership attach in `aiderbrand-system/apps/api/test/invitations/**`. Depends on 4.3.

## Phase 5: Reset password

- [x] 5.1 Implement reset token repository/service paths in `aiderbrand-system/apps/api/src/auth/**` and `aiderbrand-system/apps/api/src/users/**`; invalidate prior tokens and revoke refresh tokens on reset. Depends on 3.2.
- [x] 5.2 Add endpoints for `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /users/:id/password-reset-link`; keep forgot-password always 200 and audit admin link generation. Depends on 5.1.
- [x] 5.3 Add tests for non-oracle forgot-password, token reuse/expiry, successful reset, and `SYSTEM_ADMIN` manual link generation in `aiderbrand-system/apps/api/test/password-reset/**`. Depends on 5.2.

## Phase 6: Frontend integration

- [x] 6.1 Refactor `aiderbrand-system/apps/web/lib/types/{domain.ts,enums.ts,index.ts}` to remove `User.companyId`/`User.role`, add `CompanyMembership` and `InvitationStatus`. Depends on 2.2.
- [x] 6.2 Create `aiderbrand-system/apps/web/lib/api/client.ts`, auth service adapters, and rewrite `aiderbrand-system/apps/web/contexts/auth-context.tsx` to use API session, memberships, active company, and `X-Company-Id`. Depends on 3.2 and 6.1.
- [x] 6.3 Create `aiderbrand-system/apps/web/app/(auth)/**` pages and `aiderbrand-system/apps/web/middleware.ts`; update `aiderbrand-system/apps/web/app/page.tsx`, `(app)/layout.tsx`, `components/layout/*`, and `lib/rbac.ts` for login redirect and multi-company switching without breaking mock tickets/projects. Depends on 6.2, 4.3, and 5.2.

## Apply Progress

Batch 5 completed (2026-03-28):
- Tasks 6.1, 6.2, 6.3 — frontend auth integration aligned to backend session flows. Domain types drop `User.role`/`User.companyId` in favor of `CompanyMembership`; new minimal API client injects access token + `X-Company-Id`; `AuthContext` now hydrates real login/refresh/logout/invitation/password-reset flows with active company switching. Added `(auth)` routes (`/login`, `/invite/[token]`, `/forgot-password`, `/reset-password`, `/reset-password/[token]`), `middleware.ts`, root redirect, `AuthGuard`, and layout/header/sidebar updates. Mock tickets/projects remain usable through a slug-based company compatibility bridge while auth uses real backend membership IDs for tenant headers. Web typecheck clean.

## Phase 7: Hardening + verification

- [x] 7.1 Add audit coverage for `auth.login`, `invitation.created|accepted|revoked`, `password_reset_link.generated`, `password.reset`; verify actor/company metadata in services/interceptor. Depends on 4.3 and 5.2.
- [x] 7.2 Add backend security/config checks: cookie flags, constant-time token compare, validation pipes, rate-limit hooks, and no-self-registration route behavior. Depends on 7.1.
- [ ] 7.3 Run end-to-end verification for invite → set password → login → switch company → reset password, and document rollout notes in `openspec/changes/auth-company-invitations/tasks.md` progress updates. Depends on 6.3 and 7.2.

Batch 6 completed (2026-03-28):
- Tasks 7.1, 7.2 — backend hardening batch completed without expanding auth scope. Added `GET /auth/session` for frontend rehydration after cookie-backed refresh, and rewired web auth bootstrap to refresh + fetch canonical session instead of trusting stale local user/membership snapshots. Added route-level in-memory rate limiting for sensitive public endpoints (`/auth/login`, `/auth/accept-invitation`, `/auth/forgot-password`, `/auth/reset-password`, `/invitations/validate-token`), mirrored secure cookie clearing flags, and tightened audit metadata so login includes membership/company context, password resets include affected company IDs, and admin reset-link generation records the active company context. Full invite→reset end-to-end verification remains pending for verify/phase 7.3.

Batch 7 completed (2026-03-29):
- Verify follow-up critical batch — implemented `POST /companies` in `apps/api` with `SYSTEM_ADMIN`/`PROJECT_LEAD` RBAC, normalized+validated slug handling, atomic company creation plus creator membership bootstrap, and `company.created` audit persistence. The response now returns the created company and creator membership so the existing invite flow can immediately switch `X-Company-Id` to the new company and invite the first owner without assuming an initial owner at creation time.

Batch 8 completed (2026-03-29):
- Tasks 3.3, 4.4, 5.3 — added runnable Jest backend coverage under `apps/api/test/**` for auth session flows, invitation RBAC/acceptance, and password reset/admin link flows. Updated the API Jest config to discover tests outside `src/`, verified `npm test -- --runInBand` passes (14/14), and ran `npm run typecheck` without building. While codifying invitation permissions, tightened the backend rule from hierarchy-only to the explicit spec matrix so `ACCOUNT_OWNER` can invite only `COLLABORATOR`, matching the approved multi-tenant auth design.

Batch 9 completed (2026-03-29):
- Critical refresh-flow fix — removed the incorrect `passport-jwt` refresh strategy that tried to parse the opaque `refresh_token` cookie as a JWT. `RefreshGuard` now extracts the opaque cookie, validates it against the hashed/revocable DB record through `AuthService.validateRefreshToken()`, and attaches the validation result for `POST /auth/refresh` and `POST /auth/logout`. `AuthController` now rotates/revokes only DB-validated opaque tokens while keeping logout idempotent for missing or stale cookies. Added focused guard/controller tests for the corrected flow and re-ran targeted Jest auth tests plus `npm run typecheck` in `apps/api`.

Batch 10 completed (2026-04-05):
- P0.1 + P0.2 functional hardening batch — added SMTP-backed mail infrastructure in `apps/api` (`MAIL_ENABLED`, sender config, generic SMTP envs) and integrated real delivery attempts into forgot-password and invitation flows using `FRONTEND_URL`-backed reset/invite URLs. Forgot-password keeps the anti-enumeration response while auditing delivery success/failure; invitations now return truthful delivery metadata plus `inviteUrl` fallback when email cannot be confirmed, so `apps/web` can show either “email enviado” or a manual copy/share path without discarding `inviteToken`/`inviteUrl`.
- Companies/memberships alignment — enabled `ACCOUNT_OWNER` access to the companies frontend surface needed for v1 collaboration invites, scoped `/companies` listing to owned companies when the actor is an owner, and added real membership role updates in `apps/api` with tenancy, RBAC via the invitation matrix, and `membership.role_updated` auditing. `apps/web` now filters invitable roles by actor, surfaces truthful invitation feedback/fallbacks, and adds minimal role-change UI for memberships when `companies:memberships:update` is allowed. Focused API + web tests and both app typechecks passed; no build was run.
