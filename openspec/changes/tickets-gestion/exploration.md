# Exploration: tickets-gestion

## Current State

### Lo que existe hoy

El proyecto es un monorepo Turborepo **prácticamente en blanco**, con la siguiente base funcional:

#### `apps/web/` (Next.js 16 App Router)
- `app/layout.tsx` — Root layout con ThemeProvider + Geist fonts. Solo wrapping básico, sin routing estructurado.
- `app/page.tsx` — Página de bienvenida de scaffolding ("Project ready!"). Ninguna ruta de negocio existe.
- `components/theme-provider.tsx` — next-themes configurado (class, system, hotkey `d`).
- `lib/`, `hooks/` — **vacíos** (solo .gitkeep).
- `components.json` — shadcn estilo `radix-nova`, baseColor `neutral`, cssVariables true.

#### `packages/ui/`
- `src/components/button.tsx` — Button shadcn completo (radix-nova style, cva, 6 variants, 7 sizes).
- `src/styles/globals.css` — CSS variables completas (light/dark), CSS layers base, sidebar vars incluidas.
- `src/lib/utils.ts` — `cn()` con clsx + tailwind-merge.
- `src/hooks/` — vacío.

#### Stack confirmado
- Next.js 16.1.6 con Turbopack en dev
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS v4 (`@import "tailwindcss"`)
- shadcn `radix-nova` style
- `radix-ui` v1.4.3 (unified package, no `@radix-ui/*` separados)
- `class-variance-authority` para variants
- `zod` v3 ya instalado (en packages/ui)
- `lucide-react` v1.7.0
- NO hay state management instalado (sin Zustand, Redux, Jotai)
- NO hay react-query / SWR
- NO hay tipos de dominio definidos

#### Lo que NO existe (todo por construir)
- Cero routing de negocio (sin `/dashboard`, `/projects`, `/tickets`)
- Cero componentes de layout (Sidebar, AppShell, Header, Breadcrumb)
- Cero tipos TypeScript de dominio (Ticket, Project, Company, User, etc.)
- Cero datos mock / stores
- Cero módulos de feature
- Sin autenticación / auth context

---

## Affected Areas

- `aiderbrand-system/apps/web/app/` — aquí van todas las rutas nuevas
- `aiderbrand-system/apps/web/components/` — componentes app-specific (no compartidos)
- `aiderbrand-system/apps/web/lib/` — tipos de dominio, mock data, utils de negocio
- `aiderbrand-system/apps/web/hooks/` — hooks de estado y lógica reutilizable
- `aiderbrand-system/packages/ui/src/components/` — componentes shadcn compartidos (Sidebar, Badge, Avatar, etc.)
- `aiderbrand-system/apps/web/app/layout.tsx` — debe envolver con AppShell/Sidebar

---

## Approaches

### 1. Routing con Route Groups + Layouts anidados (App Router nativo)

Usar Next.js App Router con route groups para separar vistas de cliente vs interno:

```
app/
├── (auth)/                    # grupo sin sidebar (login futuro)
│   └── login/
├── (app)/                     # grupo CON sidebar y layout principal
│   ├── layout.tsx             # AppShell: Sidebar + main content
│   ├── dashboard/page.tsx
│   ├── projects/
│   │   ├── page.tsx           # Lista de proyectos
│   │   └── [projectId]/
│   │       ├── page.tsx       # Detalle de proyecto
│   │       └── tickets/
│   │           ├── page.tsx   # Lista de tickets del proyecto
│   │           └── [ticketId]/
│   │               └── page.tsx  # Detalle conversacional del ticket
└── page.tsx                   # Redirect a /dashboard
```

- **Pros**: Nativo Next.js, layouts reutilizados, cero overhead, RSC-first. URL semántica `/projects/[id]/tickets/[id]`. Breadcrumb fácil desde params.
- **Cons**: El detalle de ticket abre en página completa (no panel lateral), navegación requiere back button.
- **Effort**: Medium

### 2. Lista + Panel lateral con URL state (query params)

Tickets como query params: `/projects/[projectId]/tickets?selected=[ticketId]`

- **Pros**: No abandona la lista al abrir un ticket (UX estilo Gmail/Linear), URL compartible.
- **Cons**: Complejidad con RSC (params client-side), más difícil de gestionar con App Router puro.
- **Effort**: High

### 3. Rutas planas + modal sheet para detalle

Tickets en lista plana, abrir detalle como Sheet/Drawer sobre la lista.

- **Pros**: Más simple, UX moderna (estilo Notion/Linear), sin cambio de página.
- **Cons**: URL no refleja el ticket seleccionado, dificulta compartir links directos.
- **Effort**: Low

---

## Recommendation

**Enfoque híbrido: Approach 1 + parallel routes para el panel de detalle.**

Usar route groups nativos de App Router para la estructura base, con la siguiente decisión de UX:

- **Lista de tickets**: página dedicada `/projects/[projectId]/tickets`
- **Detalle de ticket**: usar [intercepting routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes) + parallel routes (`@panel` slot) para mostrar el ticket como panel lateral sin salir de la lista. Si se accede directo por URL, renderiza en página completa.

Esto da:
- URL semántica y compartible
- UX de panel lateral sin perder contexto de la lista
- Fallback en página completa para links directos
- Compatible con RSC y App Router

### Estructura de archivos recomendada

```
apps/web/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx                          # AppShell (Sidebar + main)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── projects/
│   │       ├── page.tsx                        # Lista proyectos
│   │       └── [projectId]/
│   │           ├── page.tsx                    # Detalle proyecto + tab tickets
│   │           ├── @panel/                     # Parallel route para ticket detail
│   │           │   └── tickets/
│   │           │       └── [ticketId]/
│   │           │           └── page.tsx        # Panel lateral (intercepted)
│   │           ├── (.)tickets/[ticketId]/      # Intercepting route
│   │           │   └── page.tsx
│   │           └── tickets/
│   │               ├── page.tsx                # Lista tickets del proyecto
│   │               └── [ticketId]/
│   │                   └── page.tsx            # Detalle completo (fallback)
│   └── page.tsx                                # redirect → /dashboard
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx                       # Container: sidebar + content
│   │   ├── sidebar-nav.tsx                     # Container: lógica RBAC nav items
│   │   └── breadcrumb-nav.tsx                  # Presentational: breadcrumb dinámico
│   └── ui/                                     # re-exports de @workspace/ui
│
├── features/
│   ├── tickets/
│   │   ├── components/
│   │   │   ├── ticket-list.tsx                 # Presentational: tabla/lista
│   │   │   ├── ticket-list-container.tsx       # Container: datos + filtros
│   │   │   ├── ticket-detail.tsx               # Presentational: conversación
│   │   │   ├── ticket-detail-container.tsx     # Container: lógica comentarios
│   │   │   ├── ticket-status-badge.tsx         # Presentational: badge de estado
│   │   │   ├── ticket-priority-badge.tsx       # Presentational: badge prioridad
│   │   │   ├── ticket-sla-indicator.tsx        # Presentational: countdown SLA
│   │   │   └── new-ticket-form.tsx             # Presentational: form con zod
│   │   ├── hooks/
│   │   │   ├── use-tickets.ts                  # Hook: state + filtros + CRUD mock
│   │   │   └── use-ticket-detail.ts            # Hook: comentarios + estado
│   │   └── types.ts                            # Tipos domain de ticket
│   └── projects/
│       ├── components/
│       │   ├── project-list.tsx
│       │   └── project-card.tsx
│       ├── hooks/
│       │   └── use-projects.ts
│       └── types.ts
│
├── lib/
│   ├── types/
│   │   ├── index.ts                            # Re-exports
│   │   ├── domain.ts                           # Entidades: Company, User, Project, Ticket
│   │   └── enums.ts                            # Estados, roles, prioridades
│   ├── mock/
│   │   ├── tickets.ts                          # Mock data tickets
│   │   └── projects.ts                         # Mock data proyectos
│   └── rbac.ts                                 # Helpers de permisos por rol
│
└── hooks/
    └── use-current-user.ts                     # Hook: usuario simulado (mock auth)
```

### Sidebar escalable

```
SidebarNav (Container — lee rol del usuario)
├── SidebarHeader (logo + company selector futuro)
├── SidebarSection: "Principal"
│   ├── Dashboard
│   └── Proyectos
├── SidebarSection: "Soporte"
│   └── Tickets
├── [Solo roles internos] SidebarSection: "Equipo"
│   ├── Clientes
│   └── Tareas
├── [Solo SYSTEM_ADMIN] SidebarSection: "Admin"
│   └── Configuración
└── SidebarFooter (avatar + theme toggle)
```

La lógica de visibilidad de items va en un config array filtrado por rol:
```ts
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: "all" },
  { label: "Proyectos", href: "/projects", icon: FolderKanban, roles: "all" },
  { label: "Tickets", href: "/tickets", icon: Ticket, roles: "all" },
  { label: "Tareas", href: "/tasks", icon: CheckSquare, roles: ["SYSTEM_ADMIN","PROJECT_LEAD","DELIVERY_SPECIALIST"] },
  // ...
]
```

### Componentes shadcn necesarios (en packages/ui)

| Componente | Uso |
|-----------|-----|
| `sidebar` | Layout principal app |
| `badge` | Estado ticket, prioridad |
| `avatar` | Usuario asignado, comentarios |
| `card` | Cards de proyectos, resumen ticket |
| `sheet` | Formulario nuevo ticket (mobile/overlay) |
| `dialog` | Confirmaciones de acciones críticas |
| `textarea` | Campo comentario en conversación |
| `select` | Filtros (estado, prioridad, proyecto) |
| `scroll-area` | Thread de conversación (no scroll body) |
| `separator` | Secciones en detalle ticket |
| `tooltip` | SLA indicator, acciones inline |
| `breadcrumb` | Navegación Projects > Tickets > #123 |
| `dropdown-menu` | Acciones del ticket (cambiar estado) |
| `command` | Búsqueda rápida futura |
| `alert` | Tickets vencidos SLA |
| `skeleton` | Loading states |

### State Management (frontend-only)

Sin Zustand ni Redux en esta fase. Usar:

1. **useState + useReducer** para estado local de componentes
2. **Custom hooks** (`use-tickets.ts`, `use-projects.ts`) que encapsulan la lógica y devuelven datos + handlers
3. **React Context** solo para estado verdaderamente global: usuario actual, company activa, tema
4. **Mock data estática** en `lib/mock/` como fuente de verdad temporal

Cuando llegue el backend, los hooks custom son el único punto de cambio — los componentes no se tocan.

### Tipos de dominio (a crear en `lib/types/domain.ts`)

```ts
type Role = "ACCOUNT_OWNER" | "COLLABORATOR" | "SYSTEM_ADMIN" | "PROJECT_LEAD" | "DELIVERY_SPECIALIST"
type TicketStatus = "pendiente" | "en_revision" | "en_proceso" | "cerrado"
type TicketPriority = "baja" | "media" | "alta" | "urgente"
type ProjectStatus = "planificacion" | "desarrollo" | "pruebas" | "revision_cliente" | "produccion" | "pausado" | "finalizado"

interface Company { id: string; name: string; slug: string }
interface User { id: string; name: string; email: string; role: Role; companyId: string; avatarUrl?: string }
interface Project { id: string; companyId: string; name: string; status: ProjectStatus; createdAt: Date }
interface Ticket {
  id: string
  projectId: string
  companyId: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  createdById: string
  assignedToId?: string
  createdAt: Date
  updatedAt: Date
  slaDeadline: Date
  comments: TicketComment[]
}
interface TicketComment {
  id: string
  ticketId: string
  userId: string
  content: string
  createdAt: Date
  isInternal: boolean   // Clientes NO ven comentarios internos
}
```

---

## Risks

1. **Intercepting routes + parallel routes** tienen complejidad en Next.js App Router. Si el equipo no tiene experiencia, puede aumentar el tiempo. Alternativa segura: comenzar con Approach 1 puro (página completa para detalle) e iterar.
2. **Sin state management centralizado**: si los mocks crecen mucho o hay muchas interacciones, el prop drilling puede volverse difícil. Resolver con Context rápidamente si ocurre.
3. **radix-ui v1 (unified)** vs la mayoría de docs de shadcn que usan `@radix-ui/*` separados. El `button.tsx` ya usa `Slot` de `radix-ui`, confirmar que los demás componentes shadcn también lo hagan así.
4. **Zod en packages/ui**: zod está instalado en el package compartido. Los forms con validación deben importarlo desde ahí o duplicarlo en apps/web.
5. **El ticket puede existir SIN project** según PROJECT_SPEC.md ("opcionalmente a Project"), pero el dominio definido en AGENTS.md dice "Ticket SIEMPRE asignado a Project". Hay contradicción — debe resolverse antes de especificar.

---

## Ready for Proposal

**Sí**, con una aclaración pendiente:

> ⚠️ **Decisión requerida antes de spec**: ¿El ticket puede existir sin un proyecto asignado?  
> - `PROJECT_SPEC.md` dice "opcionalmente a Project"  
> - `AGENTS.md` / contexto SDD dice "SIEMPRE asignado a un Project"  
> Esta decisión afecta el routing (`/tickets` global vs solo `/projects/[id]/tickets`), el modelo de datos, y los filtros.

Asumiendo **Ticket SIEMPRE en un Project** (según AGENTS.md), el routing propuesto es correcto.

**Approach recomendado final**: Route groups + features folder + container/presentational + custom hooks como capa de abstracción de datos. Empezar con página completa para detalle del ticket (sin intercepting routes) para reducir riesgo, con opción de evolucionar a panel lateral en sprint siguiente.
