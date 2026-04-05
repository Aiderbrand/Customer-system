# Proposal: auth-company-invitations

## Intent
Implement a secure, invitation-only authentication and authorization system. The current application lacks a backend and relies on a frontend mock with a single-company architecture. This change introduces a robust multi-tenant backend (NestJS), removes self-registration, and enforces access control via explicit invitations from authorized roles, aligning with the core project requirement of "Access strictly by invitation".

## Scope

### In Scope
- Migration from frontend mock to a real backend (NestJS + PostgreSQL).
- Login via email and password (JWT + httpOnly refresh tokens).
- Multi-company architecture: Users can belong to multiple companies via `CompanyMembership`.
- Invitation system: Opaque, single-use, time-limited tokens.
- Role-based invitation rules (e.g., SYSTEM_ADMIN/PROJECT_LEAD can invite ACCOUNT_OWNER/COLLABORATOR/DELIVERY_SPECIALIST; ACCOUNT_OWNER can invite COLLABORATOR).
- First-time user setup: Invitees set their password upon accepting the invitation.
- Password management: Forgot/Reset password flows, including a manual link generation feature for SYSTEM_ADMIN.
- Comprehensive Audit Logs for all authentication and invitation actions.

### Out of Scope
- Open user registration (self-service).
- OAuth, SSO, or 2FA.
- Bulk invitations or custom roles.
- Branded email templates (standard text/basic HTML only for v1).

## Approach
Implement a modular NestJS backend as the authoritative source for Auth, Users, Companies, and Invitations. Ensure multi-tenancy from day one by removing direct `companyId` and `role` from the `User` entity, moving them instead to a `CompanyMembership` junction table. Use opaque cryptographic tokens (not JWTs) for invitations and password resets to prevent enumeration and tampering. The Next.js frontend will consume these APIs using HttpOnly cookies for session management to prevent XSS.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/contexts/auth-context.tsx` | Modified | Replace mock with real API calls and JWT handling. |
| `apps/web/lib/types/domain.ts` | Modified | Remove `companyId` and `role` from User; add `CompanyMembership`. |
| `apps/web/app/(auth)/*` | New | Add routes for login, accept-invitation, forgot-password, reset-password. |
| `apps/api/` | New | Bootstrap NestJS backend application with required modules. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tenant Data Leakage | High | Strict backend guards validating user membership per company on every request. |
| Token Enumeration | Medium | Use `crypto.randomBytes` for opaque tokens, store hashed in DB, use constant-time comparison. |
| Race Conditions (Accept) | Low | Wrap the accept-invitation flow (User creation/update + Membership creation + Token invalidation) in a single DB transaction. |

## Rollback Plan
Since this is a foundational rewrite replacing mock data, rolling back involves reverting the Next.js `auth-context.tsx` to the previous mock implementation and dropping the newly created backend database tables (Users, Companies, Memberships, Invitations).

## Dependencies
- NestJS setup (PostgreSQL + TypeORM/Prisma).
- `nodemailer` or equivalent for sending invitation/reset emails.

## Success Criteria
- [ ] Users can only log in if they exist in the DB with a valid password.
- [ ] Users cannot self-register.
- [ ] SYSTEM_ADMIN and PROJECT_LEAD can create companies and invite all roles.
- [ ] ACCOUNT_OWNER can only invite COLLABORATORS to their specific company.
- [ ] Users can accept an invitation, set their password, and gain access to the specific company.
- [ ] A user invited to multiple companies can switch between them using the same email/password.
- [ ] Password reset flow works via email or direct link generation by SYSTEM_ADMIN.
- [ ] All invitation and auth events are recorded in the audit log.