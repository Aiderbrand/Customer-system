# Tickets Gestion Specification

## Purpose

To build a scalable ticket management UI with direct sidebar access, optional project association, and strict multi-tenant RBAC scoping.

## Requirements

### R1 — Domain Types

The system MUST define the following domain types and enumerations:

```typescript
enum Role {
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
  COLLABORATOR = 'COLLABORATOR',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  PROJECT_LEAD = 'PROJECT_LEAD',
  DELIVERY_SPECIALIST = 'DELIVERY_SPECIALIST'
}

enum TicketStatus {
  PENDIENTE = 'pendiente',
  EN_REVISION = 'en_revision',
  EN_PROCESO = 'en_proceso',
  CERRADO = 'cerrado'
}

enum Priority {
  URGENTE = 'urgente',
  ALTA = 'alta',
  MEDIA = 'media',
  BAJA = 'baja'
}

enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

interface Company { id: string; name: string; slug: string; createdAt: Date; }
interface User { id: string; name: string; email: string; role: Role; companyId: string; }
interface Project { id: string; name: string; description: string; companyId: string; createdAt: Date; status: ProjectStatus; }
interface Ticket {
  id: string; title: string; description: string;
  status: TicketStatus; priority: Priority;
  projectId?: string;
  companyId: string;
  assigneeId?: string; reporterId: string;
  createdAt: Date; updatedAt: Date; slaDeadline: Date;
  tags?: string[];
}
interface Comment {
  id: string; ticketId: string; authorId: string;
  content: string; type: 'comment' | 'status_change' | 'assignment';
  createdAt: Date;
}
```

### R2 — AppShell & Sidebar

The system MUST provide a config-driven sidebar utilizing the `shadcn` sidebar component.
- Visible to all roles: Dashboard, Tickets (direct global `/tickets`), Proyectos.
- The sidebar MUST support active state highlighting and collapsible mobile views.

### R3 — Ticket List View

The system MUST display tickets at `/tickets` (global) and `/projects/[projectId]/tickets` (project-scoped).
- MUST be filterable by status, priority, assignee, and project (global view only).
- MUST be sortable by createdAt, slaDeadline, and priority.
- MUST display title, status badge, priority badge, project (if present), assignee avatar, and SLA indicator.
- MUST scope visibility: `ACCOUNT_OWNER` and `COLLABORATOR` see only their Company's tickets; internal roles see all or filtered.
- MUST provide an empty state when no tickets match.

### R4 — Ticket Detail (Conversational View)

The system MUST render a conversational timeline at `/tickets/[ticketId]`.
- MUST display an interleaved timeline of comments and system events (status/assignments).
- MUST provide a reply box for new comments.
- MUST show an unsaved changes warning dialog when clicking outside the reply box form.
- MUST restrict status changes to `PROJECT_LEAD`, `SYSTEM_ADMIN`, and `DELIVERY_SPECIALIST`.
- MUST restrict assignment to `PROJECT_LEAD` and `SYSTEM_ADMIN`.
- MUST restrict editing to the reporter or internal roles.

### R5 — Create Ticket

The system MUST allow all roles to create tickets via a Sheet or Dialog.
- REQUIRED fields: title, priority.
- OPTIONAL fields: description, project (select), assignee.
- The system MUST auto-calculate the `slaDeadline` based on priority at creation (Urgente/Alta = 48h, Media = 72h, Baja = 5 días).
- MUST validate inputs using Zod.

### R6 — RBAC Matrix

The system MUST enforce the following permissions matrix:

| Action | ACCOUNT_OWNER | COLLABORATOR | PROJECT_LEAD | DELIVERY_SPECIALIST | SYSTEM_ADMIN |
|--------|:---:|:---:|:---:|:---:|:---:|
| View own company tickets | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all tickets | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create ticket | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change status | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign ticket | ❌ | ❌ | ✅ | ❌ | ✅ |
| Edit ticket | reporter only | reporter only | ✅ | ❌ | ✅ |
| Delete ticket | ❌ | ❌ | ❌ | ❌ | ✅ |

### R7 — SLA Display

The system MUST visually indicate SLA status on tickets:
- Green: > 50% time remaining.
- Yellow: 10-50% time remaining.
- Red: < 10% or overdue.

### R8 — Mock Data

The system MUST provide a frontend-first mock data seed including 2 companies, 5 users (one per role), 3 projects, 10 tickets (mixed project association), and 20 comments.

## Scenarios

#### Scenario: RBAC Filtering on Global List
- GIVEN un usuario ACCOUNT_OWNER logueado
- WHEN visita `/tickets`
- THEN ve solo tickets de su Company

#### Scenario: Optional Project Display
- GIVEN un ticket sin proyecto asignado
- WHEN aparece en la lista
- THEN muestra "Sin proyecto" en el campo proyecto

#### Scenario: SLA Auto-calculation
- GIVEN un usuario crea un ticket con prioridad `urgente`
- WHEN se guarda
- THEN el SLA se calcula como createdAt + 48h

#### Scenario: Status Change RBAC
- GIVEN un usuario COLLABORATOR
- WHEN intenta cambiar el estado de un ticket
- THEN la acción no está disponible en la UI

#### Scenario: Unsaved Changes Warning
- GIVEN el usuario tiene cambios sin guardar en el reply box
- WHEN hace click fuera del detalle
- THEN aparece un diálogo de confirmación
