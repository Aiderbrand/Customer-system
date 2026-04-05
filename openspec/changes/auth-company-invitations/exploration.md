# Exploration: auth-company-invitations

## Current State

El proyecto hoy es un **frontend-only Next.js 16 (App Router)** sin backend implementado.
El monorepo (`aiderbrand-system/`) contiene solo el workspace `web` y packages de UI.

Estado real de la autenticación:
- `AuthContext` es 100% mock: devuelve un usuario hardcodeado (SYSTEM_ADMIN), sin sesión, sin JWT, sin cookies.
- `User` tiene `companyId: string` (un único ID — no soporta membresías múltiples).
- RBAC existe solo en frontend (`lib/rbac.ts`) — no hay validación en backend.
- La ruta raíz redirige directamente a `/dashboard` sin ningún guard de sesión.
- No existen rutas: `/login`, `/invite/[token]`, `/reset-password`.
- No hay backend: sin API, sin base de datos, sin NestJS.

---

## Affected Areas

### Frontend (a refactorizar/crear)
- `apps/web/contexts/auth-context.tsx` — Reemplazar mock por sesión real (JWT/cookies)
- `apps/web/lib/types/domain.ts` — `User` debe dejar de tener `companyId` directo; necesita membresías
- `apps/web/lib/types/enums.ts` — Sin cambios en roles, ya están correctos
- `apps/web/lib/rbac.ts` — Mantener para UI, pero la validación real va al backend
- `apps/web/app/page.tsx` — Agregar guard: si no autenticado → `/login`
- `apps/web/app/(app)/layout.tsx` — Proteger con sesión real
- `apps/web/app/(auth)/` — Crear grupo de rutas: `login`, `invite/[token]`, `reset-password/[token]`
- `apps/web/lib/mock/` — Descontinuar mock de users/companies (reemplazar por API calls)

### Backend (a crear desde cero)
- `apps/api/` — NestJS app (nuevo workspace en el monorepo)
- Módulos: `auth`, `companies`, `users`, `invitations`, `memberships`
- Base de datos: PostgreSQL con Prisma o TypeORM

---

## Entity Model

### Core Entities

```
User
  id: UUID (PK)
  email: string (UNIQUE global)
  passwordHash: string
  name: string
  avatarUrl?: string
  isActive: boolean
  createdAt: datetime
  updatedAt: datetime

Company
  id: UUID (PK)
  name: string
  slug: string (UNIQUE)
  isActive: boolean
  createdAt: datetime
  updatedAt: datetime

CompanyMembership                       ← NUEVA entidad clave
  id: UUID (PK)
  userId: UUID (FK → User)
  companyId: UUID (FK → Company)
  role: Role enum
  isActive: boolean
  joinedAt: datetime
  updatedAt: datetime
  UNIQUE(userId, companyId)             ← un user, un rol por company

Invitation
  id: UUID (PK)
  token: string (UNIQUE, random 32 bytes)
  email: string
  companyId: UUID (FK → Company)
  role: Role enum
  invitedById: UUID (FK → User)
  status: InvitationStatus enum         ← pending | accepted | expired | revoked
  expiresAt: datetime                   ← TTL configurable (default 7 días)
  acceptedAt?: datetime
  createdAt: datetime
  updatedAt: datetime
  UNIQUE(email, companyId)              ← solo una invitación activa por email+company

PasswordResetToken
  id: UUID (PK)
  userId: UUID (FK → User)
  token: string (UNIQUE, random 32 bytes)
  expiresAt: datetime                   ← TTL corto: 1 hora
  usedAt?: datetime
  createdAt: datetime

AuditLog
  id: UUID (PK)
  actorId?: UUID (FK → User)           ← null si acción de sistema
  companyId?: UUID
  action: string                        ← 'invitation.created', 'user.joined', etc.
  entityType: string
  entityId: string
  metadata: JSONB
  createdAt: datetime
```

### Relaciones Clave

```
User ←→ Company: N:M via CompanyMembership
  - Un user puede pertenecer a múltiples companies
  - Un user tiene UN rol por company (no múltiples roles en la misma company)

Company → Invitation: 1:N
  - Una company puede tener múltiples invitaciones activas

User → Invitation: 1:N (como invitador)
  - Un user puede haber enviado múltiples invitaciones

User → PasswordResetToken: 1:N
  - Solo el último token activo es válido (invalidar anteriores al crear nuevo)
```

---

## Permission Matrix (invitaciones)

| Invitador \ Invitado | ACCOUNT_OWNER | COLLABORATOR | DELIVERY_SPECIALIST | SYSTEM_ADMIN | PROJECT_LEAD |
|----------------------|:---:|:---:|:---:|:---:|:---:|
| SYSTEM_ADMIN         | ✅  | ✅  | ✅  | ❌  | ❌  |
| PROJECT_LEAD         | ✅  | ✅  | ✅  | ❌  | ❌  |
| ACCOUNT_OWNER        | ❌  | ✅  | ❌  | ❌  | ❌  |
| DELIVERY_SPECIALIST  | ❌  | ❌  | ❌  | ❌  | ❌  |
| COLLABORATOR         | ❌  | ❌  | ❌  | ❌  | ❌  |

> SYSTEM_ADMIN y PROJECT_LEAD no pueden crear otros admins/leads internos vía invitación.
> Los roles internos (SYSTEM_ADMIN, PROJECT_LEAD) se crean directamente en DB o por otro mecanismo separado.

---

## State Machine: Invitation

```
[pending] → [accepted]  (user acepta, crea/vincula cuenta)
         → [expired]    (TTL vencido, cron job o validación lazy)
         → [revoked]    (invitador o SYSTEM_ADMIN la revoca manualmente)

[accepted] → terminal (no se puede reabrir)
[expired]  → terminal (se puede re-invitar generando nueva)
[revoked]  → terminal (se puede re-invitar generando nueva)
```

---

## Auth Flow: v1

### Login
```
POST /auth/login
  body: { email, password }
  → JWT Access Token (15min) + Refresh Token (7 días, httpOnly cookie)
  → Response include: user, memberships[]
```

### Invitación (nuevo usuario)
```
SYSTEM_ADMIN/PROJECT_LEAD/ACCOUNT_OWNER → POST /invitations
  body: { email, companyId, role }
  → Crea Invitation(status=pending, token=random, expiresAt=now+7d)
  → Envía email con link: /invite/[token]
  → (SYSTEM_ADMIN puede copiar el link directo desde UI)

Usuario recibe link → GET /invite/[token] (frontend valida estado)
  → Si pending+no expirado: muestra form de "setear contraseña + nombre"
  → POST /auth/accept-invitation { token, password, name }
    → Si User(email) existe: agrega CompanyMembership
    → Si no existe: crea User + CompanyMembership
    → Marca Invitation(status=accepted)
    → Devuelve sesión automática (login implícito)
```

### Recuperación de contraseña
```
POST /auth/forgot-password { email }
  → Crea PasswordResetToken (invalida anteriores)
  → Envía email con link: /reset-password/[token]
  → SIEMPRE responde 200 (no revelar si email existe)

GET /reset-password/[token] (frontend valida)
POST /auth/reset-password { token, newPassword }
  → Valida token (existe, no expirado, no usado)
  → Actualiza passwordHash
  → Marca token como usado
  → Invalida sesiones activas del usuario (refresh tokens)

SYSTEM_ADMIN: POST /users/:userId/password-reset-link
  → Genera token + devuelve URL completa (sin enviar email)
  → Audita: { actor: SYSTEM_ADMIN, action: 'password_reset_link.generated' }
```

### Multi-company context
```
Al hacer login → backend devuelve memberships[]
Frontend selecciona company activa (si tiene 1: auto-selecciona)
Al cambiar de company → switch de contexto (no nuevo login)
Todas las requests incluyen: X-Company-Id: [companyId] header
Backend valida que user tiene membresía activa en esa company
```

---

## Approaches

### Approach 1 — NestJS Backend + Next.js API Routes (recomendado para v1)
**Separación limpia: NestJS maneja toda la lógica, Next.js solo consume**
- Pros: Arquitectura escalable, RBAC en backend, testeable, separación de concerns
- Cons: Setup inicial más largo (nuevo workspace en monorepo)
- Effort: High (pero correcto)

### Approach 2 — Next.js API Routes only (full-stack en Next)
**Todo en Next.js: API routes como backend**
- Pros: Setup rápido, un solo app
- Cons: Dificulta separar lógica de negocio, no escala bien, no sigue AGENTS.md
- Effort: Medium

### Approach 3 — Auth service externo (Auth0, Clerk, Supabase Auth)
**Tercerizar autenticación**
- Pros: Invitaciones, reset, JWT out-of-the-box
- Cons: Vendor lock-in, las invitaciones multi-company con roles propios no son triviales, costo
- Effort: Medium (pero con limitaciones de customización)

### Recommendation
**Approach 1: NestJS Backend separado.**
- Obligatorio por AGENTS.md (arquitectura modular, RBAC en backend, audit logs)
- Permite multi-tenant estricto con `X-Company-Id` header
- Testeable independientemente del frontend
- En v1 se puede arrancar con JWT simple sin OAuth

---

## Risks

### Seguridad
- **Token de invitación predecible**: Usar `crypto.randomBytes(32).toString('hex')` — nunca UUIDs
- **Invitation token enumeration**: Hash del token en DB, comparar con timing-safe comparison
- **Tenant leakage**: Validar SIEMPRE en backend que `userId` tiene membresía en `companyId` de request
- **Password reset oracle**: La respuesta de `/forgot-password` no debe revelar si el email existe
- **Refresh token theft**: httpOnly, Secure, SameSite=Strict — no exponer en JS
- **Role escalation**: Backend debe validar que el invitador tiene permiso de invitar el rol destino
- **SYSTEM_ADMIN link generation**: Auditar cada generación de link de reset (trazabilidad crítica)

### Consistencia
- **Multi-company context sin Company activa**: Si user tiene 0 membresías activas → bloquear acceso
- **Email en múltiples companies**: `User.email` es único global, `CompanyMembership` maneja el vínculo
- **Invitación a email ya vinculado a esa company**: Rechazar (UNIQUE constraint en DB)
- **Invitación expirada que se acepta**: Validar `expiresAt` en el endpoint, no solo al generar
- **Race condition en accept-invitation**: Transacción DB atómica (crear user + membership)
- **Rol en `User` actual**: El `User` en domain.ts tiene `role: Role` — esto DEBE eliminarse. El rol vive en `CompanyMembership`, no en `User`.

### Arquitectura
- **`User.companyId`**: Actualmente el modelo frontend tiene `companyId` en `User`. Esto es incorrecto para multi-company. Debe migrar a: `User` sin `companyId`, y agregar `activeCompany: Company` y `memberships: CompanyMembership[]` al contexto de sesión.
- **RBAC en frontend**: El `rbac.ts` actual debe complementarse con validación backend. No eliminar el frontend, pero nunca confiar solo en él.
- **Tokens de invitación en URL**: Usar query param o path param con expiración corta. No poner tokens en fragmentos (#) que no lleguen al servidor.

---

## Scope v1 (IN)

| Feature | Prioridad |
|---------|-----------|
| Login email+password | CRÍTICO |
| JWT + Refresh Token (httpOnly) | CRÍTICO |
| Guard de sesión en frontend (middleware Next.js) | CRÍTICO |
| CompanyMembership (multi-company real) | CRÍTICO |
| Invitación por email con token | ALTO |
| Flujo accept-invitation (setear password + nombre) | ALTO |
| Recuperación de contraseña self-service | ALTO |
| SYSTEM_ADMIN genera link de recuperación | ALTO |
| Revocar invitación | MEDIO |
| Re-invitar (si expired/revoked) | MEDIO |
| Backend NestJS con módulos: auth, users, companies, invitations, memberships | CRÍTICO |
| Audit logs de acciones auth | ALTO |
| RBAC en backend (guards por rol) | CRÍTICO |
| Context switch multi-company en frontend | MEDIO |

## Scope v1 (OUT — para v2+)

| Feature | Razón |
|---------|-------|
| OAuth (Google, GitHub) | No requerido, app cerrada |
| 2FA / MFA | Complejidad extra no solicitada |
| SSO / SAML | Enterprise feature |
| Invitaciones masivas (CSV) | Overkill para v1 |
| Roles custom por company | Fuera de scope actual |
| Expiración de membresía | No requerido |
| Self-registration | Explícitamente excluido |
| Email templates branded | Nice-to-have v2 |

---

## Key Structural Decisions

1. **`User.role` debe eliminarse del modelo** — el rol es siempre relativo a una company via `CompanyMembership`
2. **Backend primero** — ningún flujo de auth/invitación debe existir solo en frontend
3. **Token de invitación ≠ JWT** — son tokens opacos de un solo uso con TTL
4. **Multi-company desde día 1** — cambiar `User.companyId` ahora cuesta poco; después costará mucho
5. **Audit log en toda acción auth** — invitación creada, aceptada, revocada, reset generado/usado

---

## Ready for Proposal
**Yes.** El scope está claro, los riesgos identificados, las entidades definidas y la arquitectura decidida. Se puede proceder a Proposal y luego Spec + Tasks.
