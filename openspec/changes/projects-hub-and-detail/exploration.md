# Exploration: projects-hub-and-detail

## Current State

- `PROJECT_SPEC.md` define Projects como módulo mixto cliente/interno con `Project`, `Phase`, `Task`, `Ticket`, `Proposal`, `File` y `AuditLog`, pero la implementación actual solo cubre un catálogo mínimo de proyectos + enlace a tickets.
- `/projects` (`aiderbrand-system/apps/web/app/(app)/projects/page.tsx`) muestra solo título + `ProjectListContainer`; la lista (`features/projects/components/project-list.tsx`) renderiza cards con nombre, descripción, estado y contador de tickets.
- `/projects/[projectId]` (`features/projects/components/project-detail.tsx`) solo expone header, descripción, 3 stats y CTA a tickets del proyecto. No existen fases, tareas, SLA del proyecto, notas internas, equipo ni acciones de administración.
- El shape actual de datos (`apps/web/lib/types/domain.ts`) para proyectos es insuficiente: `Project` solo tiene `id/companyId/name/description/status/timestamps`; `ProjectWithStats` solo agrega `ticketCount` y `openTicketCount`.
- `projectService` sigue en mock/local (`apps/web/lib/services/project-service.ts`) y no valida tenant en detalle: `getProject(id)` busca por `id` sin `companyId`, mientras `useProject(id)` tampoco cruza `currentCompany`. Hoy el detail puede resolver un proyecto de otra company si se conoce el ID.
- En backend no existe todavía módulo ni schema para `Project`, `Phase`, `Task`, `Ticket`, `Proposal` o `File`; `apps/api/prisma/schema.prisma` solo cubre auth, companies, memberships y audit.
- RBAC actual (`apps/web/lib/rbac.ts`) solo distingue permisos gruesos (`projects:view/create/edit/delete`). No hay permisos/capacidades explícitas para ver contenido interno del proyecto, notas internas, tareas internas o administración operativa.

## Affected Areas

- `PROJECT_SPEC.md` — fuente de verdad funcional para visibilidad, entidades, estados y SLA.
- `aiderbrand-system/apps/web/app/(app)/projects/page.tsx` — entry point del hub actual.
- `aiderbrand-system/apps/web/app/(app)/projects/[projectId]/page.tsx` — entry point del detail actual.
- `aiderbrand-system/apps/web/features/projects/components/project-list.tsx` — hoy limitado a cards resumidas sin filtros ni jerarquía.
- `aiderbrand-system/apps/web/features/projects/components/project-detail.tsx` — hoy sin IA modular ni secciones role-aware.
- `aiderbrand-system/apps/web/features/projects/hooks/use-projects.ts` — gap de tenant-safety en `useProject`.
- `aiderbrand-system/apps/web/lib/services/project-service.ts` — requiere contrato nuevo para hub/detail y validación por company.
- `aiderbrand-system/apps/web/lib/types/domain.ts` / `enums.ts` — deben crecer con fases, tareas internas, SLA y notas.
- `aiderbrand-system/apps/web/lib/rbac.ts` — necesita granularidad adicional para separar vistas cliente vs internas.
- `aiderbrand-system/apps/api/prisma/schema.prisma` — faltan modelos persistentes para soportar el módulo Projects real.

## Approaches

1. **Página única larga por proyecto** — resolver `/projects/[id]` como scroll vertical con todas las secciones una debajo de otra.
   - Pros: simple de implementar, bajo costo inicial, sin mucha navegación secundaria.
   - Cons: sobrecarga visual, mezcla información cliente/interna, más riesgo de redundancia y fugas por render condicional disperso.
   - Effort: Low

2. **Workspace por tabs role-aware** — hub con cards/tabla resumida y detail con navegación interna estable (`Resumen`, `Fases`, `Tickets`, `Actividad`; más `Tareas internas`, `Notas internas`, `Administración` solo para roles internos).
   - Pros: escala mejor, separa mentalmente vistas públicas vs internas, reduce scroll, facilita permisos por sección y reutiliza el estilo actual de cards/tabs/listados ya usado en Tickets.
   - Cons: exige definir bien defaults por rol y contratos de datos más completos.
   - Effort: Medium

3. **Dos detalles distintos por rol** — un detail para clientes y otro para equipo interno.
   - Pros: máxima claridad por audiencia, menor riesgo de fuga accidental en UI.
   - Cons: duplica layouts, lógica y mantenimiento; rompe consistencia y complica trazabilidad del mismo proyecto.
   - Effort: High

## Recommendation

**Recomiendo Approach 2: un único workspace de proyecto con arquitectura de información role-aware.**

### `/projects` — hub recomendado

- Header con título, descripción corta y CTA `Nuevo proyecto` solo para roles internos con permiso.
- Primer bloque de overview con métricas NO redundantes:
  - Todos: cantidad de proyectos, proyectos activos, proyectos en riesgo.
  - Internos: pendientes internas vencidas / SLA comprometidos.
  - Clientes: tickets abiertos de sus proyectos.
- Bloque principal con tabs por estado (`Todos`, `Planificación`, `Desarrollo`, etc.) + filtros compactos (búsqueda, estado, owner/lead para internos).
- Lista en formato cards/rows enriquecidas por proyecto:
  - nombre + estado
  - fase actual visible
  - progreso por fases
  - tickets abiertos
  - próximo hito / fecha comprometida
  - alertas de riesgo (atraso/SLA) solo para internos
- Evitar duplicar la misma métrica en card + summary + detail teaser.

### `/projects/[id]` — detail recomendado

- **Header fijo**: nombre, estado, company, fase actual, progreso general, último cambio, acciones permitidas.
- **Resumen (default tab para todos)**:
  - timeline del proyecto por fases
  - tickets abiertos/relevantes
  - próximos hitos / entregables
  - actividad reciente auditada
- **Fases**:
  - listado secuencial de fases con estado, fechas, owner, porcentaje y blockers
  - clientes ven estado/hitos; internos además ven métricas operativas y desbloqueos
- **Tickets**:
  - embed del patrón actual de tickets del proyecto
- **Actividad**:
  - eventos auditables del proyecto (cambios de estado, asignaciones, publicaciones)
- **Solo roles internos**:
  - `Tareas internas`: pendientes por fase, responsable, prioridad, SLA/vence, dependencias
  - `Notas internas`: registro operativo privado por proyecto/fase
  - `Administración`: equipo asignado, publicación/pausa/finalización, plantillas de fases, propuestas/impacto timeline

### Datos/modelos mínimos faltantes

- `ProjectPhase`
  - `id`, `projectId`, `name`, `order`, `status`, `startsAt`, `dueAt`, `completedAt`, `ownerUserId`, `isClientVisible`
- `ProjectTask`
  - `id`, `projectId`, `phaseId?`, `title`, `description`, `status`, `priority`, `assigneeUserId`, `dependsOnTaskId?`, `slaDeadline`, `isInternal`, `blockedReason?`, `completedAt`
- `ProjectNote`
  - `id`, `projectId`, `phaseId?`, `authorId`, `body`, `visibility` (`internal`), `createdAt`, `updatedAt`
- `ProjectAssignment`
  - `id`, `projectId`, `userId`, `roleOnProject` (lead/specialist/etc.), `allocation?`, `createdAt`
- `ProjectMilestone` o campos equivalentes en fase para soportar próximos hitos sin mezclarlo con tasks.
- `ProjectSlaSnapshot` o derivación explícita por task/ticket para mostrar salud operativa del proyecto sin inventar SLA global ambiguo.
- Extensión de `Project`:
  - `projectLeadId?`, `deliveryOwnerId?`, `startedAt?`, `targetLaunchAt?`, `publishedAt?`, `pausedAt?`, `completedAt?`, `healthStatus?`
- DTOs/queries agregadas:
  - `ProjectHubItem`
  - `ProjectDetailPublic`
  - `ProjectDetailInternal`
  - `ProjectPhaseSummary`
  - `ProjectPendingTaskSummary`
  - `ProjectActivityEvent`

### Principios UX/UI concretos

- **Publicar una sola verdad por dato**: si el estado general está en header, no repetirlo en cards secundarias.
- **Disclosure progresivo**: resumen primero; operación profunda en tabs internas.
- **Role gating server-first**: no renderizar secciones internas para luego ocultarlas en cliente.
- **Misma estructura visual actual**: cards, badges, tabs, listas y sidebars del sistema actual; cambiar jerarquía informativa, no el estilo.
- **Alertas por excepción**: SLA/riesgo solo cuando requieren acción, no como ruido permanente.
- **Contexto antes que acción**: en detail primero salud/fase/hitos, después acciones administrativas.

## Risks

- Riesgo de **fuga de información interna** si se reutiliza un único payload y se ocultan campos solo en frontend.
- Riesgo de **sobrecarga visual** si detalle intenta mostrar fases, tickets, tareas y notas en una sola columna.
- Riesgo de **duplicidad conceptual** entre tickets y tareas si no se refuerza que tickets = cliente/soporte y tasks = ejecución interna.
- Riesgo de **modelo ambiguo de SLA** si se habla de “SLA del proyecto” sin definir si deriva de tickets, tareas o hitos comprometidos.
- Riesgo multi-tenant actual en detail por lookup de proyecto solo por `id`.
- Riesgo de inconsistencia futura si fases/notas/tareas se agregan en mocks/UI antes de cerrar permisos y modelo backend.

## Ready for Proposal

Yes — el próximo paso recomendado es bajar esta exploración a una propuesta/scope que defina: IA final por ruta, matriz de visibilidad por rol, modelo de datos backend y contrato de payloads público vs interno.
