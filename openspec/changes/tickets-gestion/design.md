# Design: tickets-gestion

## Technical Approach

Frontend-first ticket management module on an empty Next.js 16 App Router codebase. We build the full UI shell (AppShell, Sidebar, routing) and two feature modules (tickets, projects) using Container/Presentational pattern, shadcn/ui (radix-nova), and a mock service layer via custom hooks that will swap seamlessly when the backend arrives. All data is Company-scoped and RBAC-filtered.

---

## 1. File & Folder Architecture

```
aiderbrand-system/apps/web/
├── app/
│   ├── layout.tsx                              # Root: fonts + ThemeProvider (EXISTS)
│   ├── page.tsx                                # Redirect → /dashboard
│   ├── (app)/
│   │   ├── layout.tsx                          # AppShell: SidebarProvider + Sidebar + main
│   │   ├── dashboard/
│   │   │   └── page.tsx                        # Dashboard placeholder
│   │   ├── tickets/
│   │   │   ├── page.tsx                        # Global ticket list (RSC → Container)
│   │   │   └── [ticketId]/
│   │   │       └── page.tsx                    # Ticket detail (reuses TicketDetailContainer)
│   │   └── projects/
│   │       ├── page.tsx                        # Project list
│   │       └── [projectId]/
│   │           ├── page.tsx                    # Project detail
│   │           └── tickets/
│   │               ├── page.tsx                # Project-scoped ticket list
│   │               └── [ticketId]/
│   │                   └── page.tsx            # Same TicketDetailContainer, project context
│   └── (auth)/                                 # Future: login, register (no sidebar)
│       └── login/
│           └── page.tsx                        # Placeholder
│
├── features/
│   ├── tickets/
│   │   ├── components/
│   │   │   ├── ticket-list-container.tsx       # Container: fetches data, manages filters
│   │   │   ├── ticket-list.tsx                 # Presentational: renders table/cards
│   │   │   ├── ticket-detail-container.tsx     # Container: loads ticket + timeline events
│   │   │   ├── ticket-detail.tsx               # Presentational: renders conversation view
│   │   │   ├── ticket-timeline.tsx             # Presentational: interleaved events
│   │   │   ├── ticket-reply-box.tsx            # Presentational: comment input + unsaved guard
│   │   │   ├── ticket-status-badge.tsx         # Presentational: status chip with color
│   │   │   ├── ticket-priority-badge.tsx       # Presentational: priority chip with color
│   │   │   ├── ticket-sla-indicator.tsx        # Presentational: SLA countdown/progress
│   │   │   ├── create-ticket-sheet.tsx         # Presentational: sheet form + zod validation
│   │   │   └── ticket-filters.tsx              # Presentational: filter bar (status, priority, assignee)
│   │   ├── hooks/
│   │   │   ├── use-tickets.ts                  # Service hook: list + CRUD + filters
│   │   │   ├── use-ticket-detail.ts            # Service hook: single ticket + timeline
│   │   │   └── use-ticket-actions.ts           # Service hook: status change, assign, comment
│   │   └── types.ts                            # Feature-specific DTOs, filter types
│   │
│   └── projects/
│       ├── components/
│       │   ├── project-list-container.tsx       # Container: fetches projects
│       │   ├── project-list.tsx                # Presentational: grid/list of projects
│       │   ├── project-detail-container.tsx     # Container: loads project + stats
│       │   └── project-detail.tsx              # Presentational: project info + ticket summary
│       ├── hooks/
│       │   └── use-projects.ts                 # Service hook: list + CRUD
│       └── types.ts                            # Feature-specific DTOs
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx                       # Composes SidebarProvider + Sidebar + content area
│   │   ├── app-sidebar.tsx                     # Container: reads role, renders nav items
│   │   ├── sidebar-nav-items.ts                # Config: NavItem[] definition
│   │   ├── breadcrumb-nav.tsx                  # Dynamic breadcrumb from pathname
│   │   └── app-header.tsx                      # Header bar: breadcrumb + user actions
│   ├── shared/
│   │   ├── unsaved-changes-dialog.tsx          # Reusable confirmation dialog
│   │   └── empty-state.tsx                     # Reusable empty state placeholder
│   └── theme-provider.tsx                      # EXISTS
│
├── contexts/
│   └── auth-context.tsx                        # Provides currentUser, currentCompany, hasPermission()
│
├── lib/
│   ├── types/
│   │   ├── index.ts                            # Re-exports all types
│   │   ├── domain.ts                           # Entity interfaces: Company, User, Project, Ticket, Comment
│   │   └── enums.ts                            # Role, TicketStatus, Priority, ProjectStatus, CommentType
│   ├── mock/
│   │   ├── users.ts                            # Mock users (one per role)
│   │   ├── companies.ts                        # Mock companies
│   │   ├── tickets.ts                          # Mock tickets with comments
│   │   └── projects.ts                         # Mock projects
│   ├── services/
│   │   ├── ticket-service.ts                   # Mock implementation of TicketService interface
│   │   └── project-service.ts                  # Mock implementation of ProjectService interface
│   ├── rbac.ts                                 # Permission matrix + helpers
│   └── sla.ts                                  # SLA calculation utilities
│
├── hooks/
│   └── .gitkeep                                # EXISTS (app-level hooks go in features/)
│
├── components.json                             # EXISTS: shadcn radix-nova config
├── next.config.mjs                             # EXISTS
├── tsconfig.json                               # EXISTS: @/* and @workspace/ui/* aliases
└── package.json                                # EXISTS: needs zod added
```

### packages/ui/ additions (shadcn components)

```
packages/ui/src/components/
├── button.tsx                   # EXISTS
├── sidebar.tsx                  # New: shadcn sidebar (complex, multiple sub-components)
├── badge.tsx                    # New
├── avatar.tsx                   # New
├── card.tsx                     # New
├── sheet.tsx                    # New
├── dialog.tsx                   # New
├── textarea.tsx                 # New
├── select.tsx                   # New
├── scroll-area.tsx              # New
├── separator.tsx                # New
├── tooltip.tsx                  # New
├── breadcrumb.tsx               # New
├── dropdown-menu.tsx            # New
├── skeleton.tsx                 # New
├── alert.tsx                    # New
├── input.tsx                    # New (for forms)
├── label.tsx                    # New (for forms)
└── collapsible.tsx              # New (sidebar sub-sections)
```

---

## 2. Routing Architecture

### Route Map

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `page.tsx` | `redirect('/dashboard')` |
| `(app)/layout.tsx` | `AppShell` | Sidebar + SidebarInset wrapper, wraps all authenticated routes |
| `(app)/dashboard/page.tsx` | `DashboardPage` | Placeholder with role-based welcome |
| `(app)/tickets/page.tsx` | `TicketListContainer` | Global ticket list, all company tickets |
| `(app)/tickets/[ticketId]/page.tsx` | `TicketDetailContainer` | Conversational detail, `projectId=undefined` context |
| `(app)/projects/page.tsx` | `ProjectListContainer` | Company project list |
| `(app)/projects/[projectId]/page.tsx` | `ProjectDetailContainer` | Project info + ticket summary |
| `(app)/projects/[projectId]/tickets/page.tsx` | `TicketListContainer` | Same component, receives `projectId` prop |
| `(app)/projects/[projectId]/tickets/[ticketId]/page.tsx` | `TicketDetailContainer` | Same component, receives `projectId` context |

### Shared TicketDetailContainer Strategy

The `TicketDetailContainer` is a single component used in TWO route locations:

```typescript
// features/tickets/components/ticket-detail-container.tsx

interface TicketDetailContainerProps {
  ticketId: string
  projectId?: string  // present when accessed from /projects/[id]/tickets/[id]
}

// (app)/tickets/[ticketId]/page.tsx
export default async function TicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params
  return <TicketDetailContainer ticketId={ticketId} />
}

// (app)/projects/[projectId]/tickets/[ticketId]/page.tsx
export default async function ProjectTicketPage({
  params,
}: {
  params: Promise<{ projectId: string; ticketId: string }>
}) {
  const { projectId, ticketId } = await params
  return <TicketDetailContainer ticketId={ticketId} projectId={projectId} />
}
```

The `projectId` prop controls:
- Breadcrumb context (Dashboard > Tickets > #123 vs Dashboard > Projects > Acme > Tickets > #123)
- Back navigation target
- Whether project info section shows in the detail view

Same pattern applies to `TicketListContainer` — receives optional `projectId` to scope the query.

---

## 3. Data Layer (Mock Service Pattern)

### Service Interfaces

```typescript
// lib/services/ticket-service.ts
interface TicketService {
  getTickets(filters: TicketFilters): Promise<Ticket[]>
  getTicket(id: string): Promise<TicketWithTimeline>
  createTicket(dto: CreateTicketDTO): Promise<Ticket>
  updateTicket(id: string, dto: UpdateTicketDTO): Promise<Ticket>
  addComment(ticketId: string, dto: AddCommentDTO): Promise<Comment>
  changeStatus(ticketId: string, newStatus: TicketStatus, userId: string): Promise<Ticket>
  assignTicket(ticketId: string, assigneeId: string, userId: string): Promise<Ticket>
}

interface TicketFilters {
  companyId: string
  projectId?: string           // undefined = all company tickets
  status?: TicketStatus[]
  priority?: Priority[]
  assignedToId?: string
  createdById?: string
  search?: string
}

// lib/services/project-service.ts
interface ProjectService {
  getProjects(companyId: string): Promise<Project[]>
  getProject(id: string): Promise<ProjectWithStats>
  createProject(dto: CreateProjectDTO): Promise<Project>
}
```

### Mock Implementation

```typescript
// lib/services/ticket-service.ts
class MockTicketService implements TicketService {
  private tickets = [...MOCK_TICKETS]  // mutable copy of mock data

  async getTickets(filters: TicketFilters): Promise<Ticket[]> {
    await delay(300)  // simulate network
    return this.tickets.filter(t => {
      if (t.companyId !== filters.companyId) return false
      if (filters.projectId && t.projectId !== filters.projectId) return false
      if (filters.status?.length && !filters.status.includes(t.status)) return false
      if (filters.priority?.length && !filters.priority.includes(t.priority)) return false
      return true
    })
  }
  // ... rest of CRUD
}

export const ticketService: TicketService = new MockTicketService()
```

### Hook Layer

```typescript
// features/tickets/hooks/use-tickets.ts
export function useTickets(filters?: Partial<TicketFilters>) {
  const { currentCompany } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ticketService.getTickets({
        companyId: currentCompany.id,
        ...filters,
      })
      setTickets(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentCompany.id, filters])

  useEffect(() => { fetch() }, [fetch])

  return { tickets, loading, error, refetch: fetch }
}
```

**Backend migration**: Replace `MockTicketService` with `ApiTicketService` that calls real endpoints. Hooks and components remain unchanged.

---

## 4. RBAC Architecture

### Permission System

```typescript
// lib/rbac.ts
export type Permission =
  // Tickets
  | 'tickets:view_all'       // See all company tickets
  | 'tickets:view_own'       // See only own tickets
  | 'tickets:create'         // Create new tickets
  | 'tickets:change_status'  // Change ticket status
  | 'tickets:assign'         // Assign tickets to team members
  | 'tickets:edit'           // Edit ticket title/description/priority
  | 'tickets:delete'         // Soft-delete tickets
  | 'tickets:comment'        // Add comments
  | 'tickets:view_internal'  // See internal comments
  // Projects
  | 'projects:view'          // See projects
  | 'projects:create'        // Create projects
  | 'projects:edit'          // Edit projects
  | 'projects:delete'        // Delete projects
  // Navigation
  | 'nav:tasks'              // See Tasks section
  | 'nav:clients'            // See Clients section
  | 'nav:config'             // See Config section

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SYSTEM_ADMIN: [
    'tickets:view_all', 'tickets:create', 'tickets:change_status', 'tickets:assign',
    'tickets:edit', 'tickets:delete', 'tickets:comment', 'tickets:view_internal',
    'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
    'nav:tasks', 'nav:clients', 'nav:config',
  ],
  PROJECT_LEAD: [
    'tickets:view_all', 'tickets:create', 'tickets:change_status', 'tickets:assign',
    'tickets:edit', 'tickets:comment', 'tickets:view_internal',
    'projects:view', 'projects:create', 'projects:edit',
    'nav:tasks', 'nav:clients',
  ],
  DELIVERY_SPECIALIST: [
    'tickets:view_all', 'tickets:change_status', 'tickets:comment', 'tickets:view_internal',
    'projects:view',
    'nav:tasks',
  ],
  ACCOUNT_OWNER: [
    'tickets:view_all', 'tickets:create', 'tickets:comment',
    'projects:view',
  ],
  COLLABORATOR: [
    'tickets:view_own', 'tickets:create', 'tickets:comment',
    'projects:view',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function filterByPermission<T extends { requiredPermission?: Permission }>(
  items: T[],
  role: Role,
): T[] {
  return items.filter(item =>
    !item.requiredPermission || hasPermission(role, item.requiredPermission)
  )
}
```

### Auth Context

```typescript
// contexts/auth-context.tsx
interface AuthContextValue {
  currentUser: User
  currentCompany: Company
  hasPermission: (permission: Permission) => boolean
  switchRole: (role: Role) => void  // DEV ONLY: for testing different roles
}

// Mock implementation: default user is SYSTEM_ADMIN
// A dev toolbar dropdown allows switching roles to test RBAC visually
```

---

## 5. Sidebar Design

### Navigation Config

```typescript
// components/layout/sidebar-nav-items.ts
import {
  LayoutDashboard, Ticket, FolderKanban, CheckSquare,
  Users, Settings
} from 'lucide-react'

interface NavSection {
  label: string
  items: NavItem[]
}

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  requiredPermission?: Permission
  badge?: () => number | undefined  // dynamic count
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Tickets', href: '/tickets', icon: Ticket },
      { label: 'Proyectos', href: '/projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Tareas', href: '/tasks', icon: CheckSquare, requiredPermission: 'nav:tasks' },
      { label: 'Clientes', href: '/clients', icon: Users, requiredPermission: 'nav:clients' },
    ],
  },
  {
    label: 'Administracion',
    items: [
      { label: 'Configuracion', href: '/config', icon: Settings, requiredPermission: 'nav:config' },
    ],
  },
]
```

### Sidebar Component Structure

Uses shadcn `Sidebar` component (SidebarProvider + Sidebar + SidebarContent, etc.):

```
AppShell (layout.tsx)
├── SidebarProvider
│   ├── Sidebar
│   │   ├── SidebarHeader → Logo + Company name
│   │   ├── SidebarContent
│   │   │   └── For each NavSection (filtered by RBAC):
│   │   │       ├── SidebarGroup
│   │   │       │   ├── SidebarGroupLabel → section label
│   │   │       │   └── SidebarGroupContent
│   │   │       │       └── SidebarMenu
│   │   │       │           └── SidebarMenuItem + SidebarMenuButton per NavItem
│   │   └── SidebarFooter → Avatar + name + role + theme toggle + logout
│   └── SidebarInset
│       ├── AppHeader → SidebarTrigger + BreadcrumbNav + role switcher (dev)
│       └── main → {children}
```

---

## 6. Ticket Conversational View Design

### Timeline Architecture

```typescript
// features/tickets/types.ts
type TimelineEvent =
  | { type: 'comment'; data: Comment; at: Date }
  | { type: 'status_change'; data: { from: TicketStatus; to: TicketStatus; changedById: string }; at: Date }
  | { type: 'assignment'; data: { assigneeId: string; assignedById: string }; at: Date }
  | { type: 'created'; data: { createdById: string }; at: Date }

interface TicketWithTimeline extends Ticket {
  timeline: TimelineEvent[]  // sorted by `at` ascending
}
```

### Component Hierarchy

```
TicketDetailContainer (Container)
├── Breadcrumb context (dynamic based on projectId prop)
├── TicketDetail (Presentational)
│   ├── Header: title, status badge, priority badge, SLA indicator
│   ├── Sidebar panel (right): assignee, project, dates, SLA countdown
│   ├── TicketTimeline (Presentational)
│   │   └── For each TimelineEvent (sorted chronologically):
│   │       ├── CommentBubble (if type='comment')
│   │       │   └── Avatar + name + timestamp + content
│   │       │       + "Internal" badge if isInternal (RBAC-gated visibility)
│   │       └── SystemEvent (if type='status_change' | 'assignment' | 'created')
│   │           └── Centered muted text with icon
│   └── TicketReplyBox (Presentational)
│       ├── Textarea with placeholder
│       ├── "Internal comment" toggle (only for internal roles)
│       ├── Submit button
│       └── Unsaved changes detection → triggers dialog on navigate away
```

### Unsaved Changes Guard

```typescript
// components/shared/unsaved-changes-dialog.tsx
// Uses Dialog component to warn when:
// 1. User clicks outside a modal with unsaved form data
// 2. User navigates away from reply box with typed content

// TicketReplyBox tracks dirty state:
const [content, setContent] = useState('')
const isDirty = content.trim().length > 0

// On navigation attempt (router.beforePopState or custom hook):
// Show Dialog: "Tenes cambios sin guardar. ¿Seguro que queres salir?"
```

---

## 7. Component Catalog (shadcn/ui)

| Component | Usage | Install target |
|-----------|-------|----------------|
| `sidebar` | Main app navigation shell | `packages/ui` |
| `badge` | Ticket status, priority indicators | `packages/ui` |
| `avatar` | User avatars in timeline, sidebar footer | `packages/ui` |
| `card` | Ticket list items, project cards, dashboard stats | `packages/ui` |
| `sheet` | Create ticket form (slides from right) | `packages/ui` |
| `dialog` | Unsaved changes warning, delete confirmations | `packages/ui` |
| `textarea` | Reply box in ticket conversation | `packages/ui` |
| `select` | Status change, project select, priority filter | `packages/ui` |
| `scroll-area` | Ticket timeline scrollable container | `packages/ui` |
| `separator` | Visual dividers in timeline, sidebar sections | `packages/ui` |
| `tooltip` | SLA countdown hover, avatar name hover | `packages/ui` |
| `breadcrumb` | Navigation path in app header | `packages/ui` |
| `dropdown-menu` | User menu (sidebar footer), ticket bulk actions | `packages/ui` |
| `skeleton` | Loading states for lists and detail views | `packages/ui` |
| `alert` | SLA overdue warnings, error states | `packages/ui` |
| `input` | Form fields in create ticket sheet | `packages/ui` |
| `label` | Form labels paired with inputs | `packages/ui` |
| `collapsible` | Sidebar section expand/collapse | `packages/ui` |

**Total**: 18 components to install via `npx shadcn@latest add`.

---

## 8. SLA Calculation Design

```typescript
// lib/sla.ts
export const SLA_HOURS: Record<Priority, number> = {
  urgente: 48,
  alta: 48,
  media: 72,
  baja: 120,
}

export function calculateSlaDeadline(priority: Priority, createdAt: Date): Date {
  const deadline = new Date(createdAt)
  deadline.setHours(deadline.getHours() + SLA_HOURS[priority])
  return deadline
}

export type SlaStatus = 'ok' | 'warning' | 'critical' | 'overdue'

export function getSlaStatus(deadline: Date, now: Date = new Date()): SlaStatus {
  const remainingMs = deadline.getTime() - now.getTime()
  if (remainingMs <= 0) return 'overdue'

  const totalHours = remainingMs / (1000 * 60 * 60)
  if (totalHours <= 4) return 'critical'   // less than 4 hours
  if (totalHours <= 12) return 'warning'   // less than 12 hours
  return 'ok'
}

export function getSlaRemainingPercentage(
  createdAt: Date,
  deadline: Date,
  now: Date = new Date(),
): number {
  const total = deadline.getTime() - createdAt.getTime()
  const remaining = deadline.getTime() - now.getTime()
  return Math.max(0, Math.min(100, (remaining / total) * 100))
}

export function formatSlaRemaining(deadline: Date, now: Date = new Date()): string {
  const remainingMs = deadline.getTime() - now.getTime()
  if (remainingMs <= 0) return 'Vencido'

  const hours = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}
```

---

## 9. TypeScript Domain Types

```typescript
// lib/types/enums.ts
export type Role =
  | 'SYSTEM_ADMIN'
  | 'PROJECT_LEAD'
  | 'DELIVERY_SPECIALIST'
  | 'ACCOUNT_OWNER'
  | 'COLLABORATOR'

export type TicketStatus = 'pendiente' | 'en_revision' | 'en_proceso' | 'cerrado'

export type Priority = 'baja' | 'media' | 'alta' | 'urgente'

export type ProjectStatus =
  | 'planificacion'
  | 'desarrollo'
  | 'pruebas'
  | 'revision_cliente'
  | 'produccion'
  | 'pausado'
  | 'finalizado'

export type CommentType = 'public' | 'internal'

// lib/types/domain.ts
export interface Company {
  id: string            // UUID
  name: string
  slug: string
  createdAt: Date
}

export interface User {
  id: string            // UUID
  companyId: string
  name: string
  email: string
  role: Role
  avatarUrl?: string
  createdAt: Date
}

export interface Project {
  id: string            // UUID
  companyId: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
}

export interface ProjectWithStats extends Project {
  ticketCount: number
  openTicketCount: number
}

export interface Ticket {
  id: string            // UUID
  companyId: string
  projectId?: string    // OPTIONAL — ticket can exist without project
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  createdById: string
  assignedToId?: string
  slaDeadline: Date
  createdAt: Date
  updatedAt: Date
}

export interface TicketWithTimeline extends Ticket {
  timeline: TimelineEvent[]
}

export interface Comment {
  id: string            // UUID
  ticketId: string
  userId: string
  content: string
  type: CommentType     // 'public' | 'internal'
  createdAt: Date
}

export type TimelineEvent =
  | { type: 'comment'; data: Comment; at: Date }
  | { type: 'status_change'; data: { from: TicketStatus; to: TicketStatus; changedById: string }; at: Date }
  | { type: 'assignment'; data: { assigneeId: string; assignedById: string }; at: Date }
  | { type: 'created'; data: { createdById: string }; at: Date }

// DTOs (for create/update operations)
export interface CreateTicketDTO {
  title: string
  description: string
  priority: Priority
  projectId?: string
}

export interface UpdateTicketDTO {
  title?: string
  description?: string
  priority?: Priority
  projectId?: string | null   // null to unlink
}

export interface AddCommentDTO {
  content: string
  type: CommentType
}

export interface CreateProjectDTO {
  name: string
  description: string
}
```

---

## 10. Architecture Decisions Record (ADR)

### ADR-001: Route Groups for AppShell Isolation

**Choice**: Use `(app)` route group with shared layout for all authenticated routes, `(auth)` for unauthenticated.

**Alternatives considered**: Single layout with conditional sidebar rendering; middleware-based redirect.

**Rationale**: Route groups are native App Router. The `(app)/layout.tsx` wraps ALL authenticated routes with the AppShell (Sidebar + SidebarInset), guaranteeing consistent layout without conditional logic. `(auth)` routes render without sidebar. Clean separation, zero runtime cost, no layout flicker.

---

### ADR-002: Feature Folders over Type Folders

**Choice**: `features/tickets/` and `features/projects/` each containing their own `components/`, `hooks/`, `types.ts`.

**Alternatives considered**: Flat `components/` + `hooks/` directories organized by type; domain-driven `modules/` pattern.

**Rationale**: Feature folders keep related code colocated. When working on tickets, everything is in one place. Scales better than type folders (which scatter related code). Container/Presentational pattern is enforced within each feature folder. Shared code lives in `lib/` and `components/shared/`.

---

### ADR-003: Custom Hooks as Service Layer (Replaces Backend Later)

**Choice**: Define `TicketService` / `ProjectService` interfaces with mock implementations. Hooks consume services.

**Alternatives considered**: Direct `useState` with inline mock data; React Query with mock fetchers; Server Actions.

**Rationale**: The Service Layer pattern (from AGENTS.md) creates a clean seam. Today: `MockTicketService` reads from in-memory arrays with `await delay()`. Tomorrow: `ApiTicketService` calls real endpoints. Hooks never change, components never change. Only the service instantiation swaps. React Query is overkill without a real API — we add it when the backend arrives.

---

### ADR-004: React Context Only (No Zustand Yet)

**Choice**: Use React Context for `AuthContext` (user, company, permissions). Component-local state for everything else.

**Alternatives considered**: Zustand, Jotai, Redux Toolkit.

**Rationale**: We have exactly ONE piece of global state: the current user session. Everything else is either server-fetched (service hooks) or component-local (filters, form state). Adding a state management library for one context is over-engineering. If we later need shared cross-component state (e.g., notification counts, real-time updates), we can introduce Zustand then. The hook-based service layer already encapsulates data fetching state.

---

### ADR-005: Shared TicketDetail Between Global and Project Routes

**Choice**: Single `TicketDetailContainer` component used in both `/tickets/[ticketId]` and `/projects/[projectId]/tickets/[ticketId]`.

**Alternatives considered**: Separate page components with duplicated logic; redirect all ticket access to one canonical URL.

**Rationale**: The route page files are thin — they extract params and pass them to the Container. The Container receives an optional `projectId` prop that only affects: (1) breadcrumb context, (2) back button target, (3) whether to show project info section. ALL data fetching and rendering logic is identical. Zero duplication, two URL entry points. Same pattern applies to `TicketListContainer`.

---

## Data Flow

```
Route Page (extracts params)
    │
    ▼
Container Component (client component, "use client")
    │
    ├── useAuth() → currentUser, currentCompany, hasPermission()
    ├── useTickets(filters) or useTicketDetail(id) → { data, loading, error }
    │       │
    │       ▼
    │   ticketService.getTickets(...) → Mock data (today) / API call (future)
    │
    ▼
Presentational Component (receives props only, zero data fetching)
    │
    ├── Renders UI using shadcn/ui components
    ├── Calls action callbacks (onSubmit, onStatusChange, etc.)
    └── RBAC: uses hasPermission() to conditionally render actions
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `apps/web/app/page.tsx` | Modify | Redirect to `/dashboard` |
| `apps/web/app/(app)/layout.tsx` | Create | AppShell layout with Sidebar |
| `apps/web/app/(app)/dashboard/page.tsx` | Create | Dashboard placeholder |
| `apps/web/app/(app)/tickets/page.tsx` | Create | Global ticket list route |
| `apps/web/app/(app)/tickets/[ticketId]/page.tsx` | Create | Ticket detail route |
| `apps/web/app/(app)/projects/page.tsx` | Create | Project list route |
| `apps/web/app/(app)/projects/[projectId]/page.tsx` | Create | Project detail route |
| `apps/web/app/(app)/projects/[projectId]/tickets/page.tsx` | Create | Project-scoped ticket list |
| `apps/web/app/(app)/projects/[projectId]/tickets/[ticketId]/page.tsx` | Create | Project-scoped ticket detail |
| `apps/web/features/tickets/**` | Create | Ticket feature module (11 components, 3 hooks, types) |
| `apps/web/features/projects/**` | Create | Project feature module (4 components, 1 hook, types) |
| `apps/web/components/layout/**` | Create | AppShell, Sidebar, Breadcrumb, Header (5 files) |
| `apps/web/components/shared/**` | Create | Unsaved changes dialog, empty state (2 files) |
| `apps/web/contexts/auth-context.tsx` | Create | Auth context with mock user |
| `apps/web/lib/types/**` | Create | Domain types, enums (3 files) |
| `apps/web/lib/mock/**` | Create | Mock data (4 files) |
| `apps/web/lib/services/**` | Create | Service interfaces + mock impls (2 files) |
| `apps/web/lib/rbac.ts` | Create | Permission matrix + helpers |
| `apps/web/lib/sla.ts` | Create | SLA calculation utilities |
| `packages/ui/src/components/*.tsx` | Create | 18 shadcn components |

**Total**: ~50 new files, 1 modified, 0 deleted.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | SLA calculations (`lib/sla.ts`) | Pure function tests with edge cases (exact deadline, overdue, etc.) |
| Unit | RBAC permissions (`lib/rbac.ts`) | Verify each role has correct permissions, `filterByPermission` works |
| Unit | Service layer mock (`lib/services/`) | Verify CRUD operations, filter logic |
| Integration | Container components | Test that containers fetch data and pass correct props to presentational |
| Visual | Presentational components | Manual verification across roles (dev toolbar role switcher) |

---

## Migration / Rollout

No migration required. This is a greenfield frontend module on an empty codebase. All new files. Rollback is a simple `git revert`.

---

## Open Questions

- [x] ~~Ticket project association: optional or required?~~ **Resolved: OPTIONAL** (confirmed in task context)
- [ ] Intercepting routes for ticket detail panel — deferred to future iteration. Starting with full-page detail for simplicity.
- [ ] Company selector in sidebar — needed for SYSTEM_ADMIN who might manage multiple companies? Deferred to future phase.
