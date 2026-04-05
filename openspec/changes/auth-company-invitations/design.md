# Design: auth-company-invitations

## Technical Approach

Replace frontend-only mock auth with a real NestJS backend (`apps/api/`) as the authoritative source for authentication, authorization, and invitation management. Multi-tenancy from day 1 via `CompanyMembership` (drop `User.role` and `User.companyId`). JWT access + httpOnly refresh cookies. Opaque tokens for invitations and password resets. Frontend remains functional during migration via a service abstraction layer that swaps mock → API incrementally.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Backend framework | NestJS in `apps/api/` workspace | Next.js API routes, external auth (Clerk) | AGENTS.md mandates modular NestJS; testeable independently; RBAC in backend |
| ORM | Prisma | TypeORM, Drizzle | Schema-first, strong migration system, monorepo-friendly |
| Token storage | httpOnly cookie (refresh) + short-lived access token in memory | localStorage, session cookie | XSS-safe; refresh in cookie avoids token theft from JS |
| Invitation tokens | Opaque `crypto.randomBytes(32)`, SHA-256 hashed in DB | JWT-based tokens | Prevents tampering, enumeration; revocable server-side |
| Tenant context | `X-Company-Id` header validated per request | Subdomain, JWT claim | Simple, explicit; frontend controls active company; backend validates membership |
| Password hashing | bcrypt (cost 12) | argon2 | bcrypt is battle-tested, simpler setup; argon2 for v2 if needed |
| Frontend migration | Service interface pattern (mock → API swap) | Big-bang rewrite | Keeps current UI functional; incremental switch per module |

## Data Model

### Entities (PostgreSQL, all UUIDs, timestamps, soft-delete where noted)

```
User {
  id          UUID PK
  email       VARCHAR UNIQUE (global)
  passwordHash VARCHAR
  name        VARCHAR
  avatarUrl   VARCHAR?
  isActive    BOOLEAN DEFAULT true
  createdAt   TIMESTAMPTZ
  updatedAt   TIMESTAMPTZ
}

Company {
  id          UUID PK
  name        VARCHAR
  slug        VARCHAR UNIQUE
  isActive    BOOLEAN DEFAULT true
  createdAt   TIMESTAMPTZ
  updatedAt   TIMESTAMPTZ
}

CompanyMembership {
  id          UUID PK
  userId      UUID FK → User
  companyId   UUID FK → Company
  role        Role ENUM
  isActive    BOOLEAN DEFAULT true
  joinedAt    TIMESTAMPTZ
  updatedAt   TIMESTAMPTZ
  UNIQUE(userId, companyId)
}

Invitation {
  id          UUID PK
  tokenHash   VARCHAR UNIQUE  -- SHA-256 of opaque token
  email       VARCHAR
  companyId   UUID FK → Company
  role        Role ENUM
  invitedById UUID FK → User
  status      InvitationStatus ENUM (pending|accepted|expired|revoked)
  expiresAt   TIMESTAMPTZ  -- default: now + 7d
  acceptedAt  TIMESTAMPTZ?
  createdAt   TIMESTAMPTZ
  updatedAt   TIMESTAMPTZ
  UNIQUE(email, companyId) WHERE status='pending'  -- partial unique
}

PasswordResetToken {
  id          UUID PK
  userId      UUID FK → User
  tokenHash   VARCHAR UNIQUE  -- SHA-256 of opaque token
  expiresAt   TIMESTAMPTZ  -- default: now + 1h
  usedAt      TIMESTAMPTZ?
  createdAt   TIMESTAMPTZ
}

RefreshToken {
  id          UUID PK
  userId      UUID FK → User
  tokenHash   VARCHAR UNIQUE
  expiresAt   TIMESTAMPTZ  -- 7d
  revokedAt   TIMESTAMPTZ?
  createdAt   TIMESTAMPTZ
}

AuditLog {
  id          UUID PK
  actorId     UUID? FK → User  -- null for system actions
  companyId   UUID?
  action      VARCHAR  -- 'auth.login', 'invitation.created', etc.
  entityType  VARCHAR
  entityId    VARCHAR
  metadata    JSONB
  ipAddress   VARCHAR?
  createdAt   TIMESTAMPTZ
}
```

### Relations
```
User ←→ Company : N:M via CompanyMembership
Company → Invitation : 1:N
User → Invitation : 1:N (as inviter)
User → PasswordResetToken : 1:N
User → RefreshToken : 1:N
```

## Backend Modules (NestJS)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/          -- JwtAuthGuard, RolesGuard, CompanyMembershipGuard
│   ├── decorators/      -- @CurrentUser, @RequireRoles, @CompanyContext
│   ├── interceptors/    -- AuditInterceptor
│   ├── filters/         -- HttpExceptionFilter
│   └── pipes/           -- ValidationPipe (class-validator)
├── prisma/
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   └── schema.prisma
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts  -- login, refresh, logout, accept-invitation, forgot/reset password
│   ├── auth.service.ts
│   ├── strategies/         -- JwtStrategy, JwtRefreshStrategy
│   └── dto/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts  -- profile, admin generate reset link
│   ├── users.service.ts
│   └── users.repository.ts
├── companies/
│   ├── companies.module.ts
│   ├── companies.controller.ts
│   ├── companies.service.ts
│   └── companies.repository.ts
├── memberships/
│   ├── memberships.module.ts
│   ├── memberships.service.ts
│   └── memberships.repository.ts
├── invitations/
│   ├── invitations.module.ts
│   ├── invitations.controller.ts  -- create, revoke, list, validate token
│   ├── invitations.service.ts
│   └── invitations.repository.ts
└── audit/
    ├── audit.module.ts
    ├── audit.service.ts
    └── audit.repository.ts
```

## Data Flow

### Login
```
Browser → POST /auth/login {email, password}
  → AuthService.validateCredentials()
  → Generate accessToken (JWT, 15min) + refreshToken (opaque, 7d)
  → Set refreshToken in httpOnly cookie
  → Return {accessToken, user, memberships[]}
  → Frontend stores accessToken in memory, selects activeCompany
```

### Accept Invitation
```
Browser → GET /invite/[token] → Frontend validates token via GET /invitations/validate?token=x
  → Shows set-password form
  → POST /auth/accept-invitation {token, password, name}
    → BEGIN TRANSACTION
    → Find invitation by tokenHash (SHA-256), validate pending + not expired
    → If User(email) exists: create CompanyMembership
    → If User(email) !exists: create User + CompanyMembership
    → Set invitation.status = accepted
    → COMMIT
    → Auto-login (return tokens + session)
```

### Forgot / Reset Password
```
POST /auth/forgot-password {email} → ALWAYS 200
  → If user exists: create PasswordResetToken, invalidate previous, send email
  → If not exists: no-op (no oracle)

POST /auth/reset-password {token, newPassword}
  → Validate tokenHash, not expired, not used
  → Update passwordHash, mark token used
  → Revoke all refresh tokens (force re-login)

POST /users/:id/password-reset-link (SYSTEM_ADMIN only)
  → Generate token, return URL (no email sent)
  → AuditLog: password_reset_link.generated
```

### Company Switch
```
Frontend: user selects company from dropdown
  → Updates X-Company-Id header for all subsequent requests
  → No re-authentication needed
  → Backend CompanyMembershipGuard validates membership on every request
```

## Guards / Authorization Stack

```
Request → JwtAuthGuard (validates accessToken)
        → CompanyMembershipGuard (validates X-Company-Id + user has active membership)
        → RolesGuard (validates user's role in active company matches @RequireRoles())
```

Invitation permission enforcement in `InvitationsService.create()`:
```typescript
// INVITATION_PERMISSION_MATRIX checked in service layer, NOT in guard
const canInvite: Record<Role, Role[]> = {
  SYSTEM_ADMIN: ['ACCOUNT_OWNER', 'COLLABORATOR', 'DELIVERY_SPECIALIST'],
  PROJECT_LEAD: ['ACCOUNT_OWNER', 'COLLABORATOR', 'DELIVERY_SPECIALIST'],
  ACCOUNT_OWNER: ['COLLABORATOR'],
  DELIVERY_SPECIALIST: [],
  COLLABORATOR: [],
};
```

## Frontend Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/lib/types/domain.ts` | Modify | Remove `companyId` and `role` from `User`; add `CompanyMembership` type |
| `apps/web/lib/types/enums.ts` | Modify | Add `InvitationStatus` enum |
| `apps/web/contexts/auth-context.tsx` | Rewrite | Real JWT session, memberships[], activeCompany, company switch |
| `apps/web/app/(auth)/login/page.tsx` | Create | Login form |
| `apps/web/app/(auth)/invite/[token]/page.tsx` | Create | Accept invitation form |
| `apps/web/app/(auth)/forgot-password/page.tsx` | Create | Forgot password form |
| `apps/web/app/(auth)/reset-password/[token]/page.tsx` | Create | Reset password form |
| `apps/web/app/(auth)/layout.tsx` | Create | Minimal layout, no sidebar |
| `apps/web/middleware.ts` | Create | Next.js middleware: redirect to /login if no session |
| `apps/web/lib/api/client.ts` | Create | Fetch wrapper: injects accessToken + X-Company-Id |
| `apps/web/app/page.tsx` | Modify | Redirect to /login instead of /dashboard |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | AuthService, InvitationsService, permission matrix | Jest + mocked Prisma |
| Integration | Login flow, invitation accept, reset password | Supertest + test DB |
| E2E | Full invitation → login → switch company | Playwright (v2) |

## Migration / Rollout

**Incremental strategy (no big-bang):**

1. **Phase 0**: Bootstrap `apps/api/` with Prisma schema + DB migrations. Seed SYSTEM_ADMIN user.
2. **Phase 1**: Auth module (login/refresh/logout). Frontend `(auth)` routes + middleware. Mock services remain for tickets/projects.
3. **Phase 2**: Invitation + membership modules. `domain.ts` migration (drop User.role/companyId). Update AuthContext.
4. **Phase 3**: Password reset flows. AuditLog module. Admin generate-link feature.

Each phase is independently deployable. Mock data coexists during Phase 1-2 for non-auth features.

## Invariants

1. **No self-registration** -- Users can ONLY be created via invitation acceptance
2. **Tenant isolation** -- Every data-fetching request MUST pass through `CompanyMembershipGuard`
3. **Token opacity** -- Invitation and reset tokens are NEVER JWTs; always opaque + hashed in DB
4. **Atomic accept** -- User creation + membership + token invalidation in single transaction
5. **Role in membership, never in user** -- `User` entity has NO role field
6. **Always 200 on forgot-password** -- No email existence oracle

## Open Questions

- [ ] Email transport for v1: Nodemailer + SMTP or Resend/SendGrid? (not blocking -- abstracted behind interface)
- [ ] Should `RefreshToken` be stored in DB or Redis? (DB for v1 simplicity, Redis for v2 scale)
