# Design: Projects Hub and Detail

## Technical Approach

Implement a single role-aware workspace over the existing Next.js container/presentational pattern. `/projects` becomes a scan-first hub; `/projects/[projectId]` becomes one workspace with shared tabs (`Resumen`, `Fases`, `Tickets`, `Actividad`) and internal tabs (`Tareas internas`, `Notas internas`, `Administración`). Data must be tenant-scoped server/service-first, with separate public/internal payloads so restricted fields never reach client roles.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| IA del detail | Un solo workspace con tabs role-aware | página larga única; dos details separados por rol | Escala mejor, evita duplicar layouts y mantiene una sola identidad del proyecto. |
| Source of truth | Header + `project context` canónico; sidebars/tabs consumen referencias derivadas | repetir estado/KPIs por sección | Reduce contradicciones y ruido. Cada dato vive una vez. |
| Seguridad | `getProjectDetail(companyId, projectId, audience)` y `getProjectHub(companyId, role)` | payload único con ocultamiento en frontend | Evita fuga multi-tenant y de campos internos. |
| Salud/SLA | Resumen discreto interno (`on-track / at-risk / breached`) derivado de tareas internas abiertas con due deadline | mostrar timers por todos lados; mezclar tickets y tareas | Mantiene señal operativa sin contaminar la UI y respeta que tickets != tareas. |

## Data Flow

`page.tsx` → container (`useProjectsHub` / `useProjectWorkspace`) → service (`project-service`) → role/tenant filtering → presentational sections.

`AuthContext(currentCompany,currentRole)` → service params → payload público/interno → tabs habilitados → components puros.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/app/(app)/projects/page.tsx` | Modify | Shell del hub con header, summary y filtros. |
| `apps/web/app/(app)/projects/[projectId]/page.tsx` | Modify | Shell del workspace con navegación por sección. |
| `apps/web/features/projects/components/*` | Modify/Create | `projects-hub`, `project-workspace-header`, `project-section-tabs`, cards/sidebars/empty states. |
| `apps/web/features/projects/hooks/use-projects.ts` | Modify | Separar hooks hub/detail con `companyId` y `role`. |
| `apps/web/lib/services/project-service.ts` | Modify | Nuevos métodos hub/detail tenant-safe. |
| `apps/web/lib/types/domain.ts` | Modify | Tipos de phase/task/note/activity y payloads UI. |
| `apps/web/lib/rbac.ts` | Modify | Capacidades por sección: internal-tasks, internal-notes, admin, health. |
| `apps/api/prisma/schema.prisma` | Future modify | Base para ProjectPhase, ProjectTask, ProjectNote, ProjectAssignment. |

## Interfaces / Contracts

```ts
type ProjectAudience = 'client' | 'internal'

interface ProjectHubItem {
  id: string; name: string; status: ProjectStatus; currentPhase?: string
  progressPct: number; openTicketCount: number; nextMilestone?: string
  health?: 'on-track' | 'at-risk' | 'breached'
}

interface ProjectWorkspacePayload {
  project: { id: string; companyId: string; name: string; status: ProjectStatus; currentPhase?: string; progressPct: number; targetLaunchAt?: Date; updatedAt: Date }
  summary: { openTickets: number; visiblePhases: number; nextMilestone?: string; health?: 'on-track' | 'at-risk' | 'breached' }
  phases: ProjectPhaseSummary[]
  tickets: { id: string; title: string; status: TicketStatus; priority: Priority }[]
  activity: ProjectActivityEvent[]
  internal?: { tasks: ProjectPendingTaskSummary[]; notes: ProjectNote[]; admin: ProjectAdminSummary }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Mapeo de tabs, health aggregation, canonical metadata selectors | funciones puras + role matrix tests |
| Integration | service tenant-safety y payload client/internal | tests de hooks/containers con mocks por rol |
| E2E | navegación hub → detail → tab permitida/prohibida | flujos por ACCOUNT_OWNER y PROJECT_LEAD |

## Migration / Rollout

Incremental V1: (1) cerrar tenant-safety en detail actual, (2) introducir nuevos tipos/payloads mock, (3) reemplazar hub, (4) reemplazar detail shared tabs, (5) agregar tabs internas detrás de RBAC, (6) conectar backend real cuando existan modelos. Sin migración destructiva; usar fallbacks/empty states cuando falten fases o tareas.

## Open Questions

- [ ] Confirmar si `Actividad` expone sólo audit logs del proyecto o también eventos de tickets agregados.
- [ ] Definir si `Administración` permite editar/publicar en V1 o queda read-only con CTA futuros.
- [ ] Confirmar ownership semántico entre `projectLeadId` y `deliveryOwnerId` en UI.
