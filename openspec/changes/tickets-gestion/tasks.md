# Tasks: tickets-gestion

## Group 1 — Foundation

- [x] **TASK-001**: Instalar componentes shadcn y dependencias de formularios
  - Files: `aiderbrand-system/packages/ui/src/components/{sidebar,badge,avatar,card,sheet,dialog,textarea,select,scroll-area,separator,tooltip,breadcrumb,dropdown-menu,skeleton,alert,input,label,collapsible}.tsx`, `aiderbrand-system/apps/web/package.json`
  - Depends on: none
  - Notes: agregar `zod` en `apps/web`; mantener exports consistentes en `packages/ui`.
- [x] **TASK-002**: Crear enums y entidades de dominio compartidas
  - Files: `aiderbrand-system/apps/web/lib/types/enums.ts`, `aiderbrand-system/apps/web/lib/types/domain.ts`, `aiderbrand-system/apps/web/lib/types/index.ts`
  - Depends on: none
  - Notes: usar UUIDs, `projectId` opcional y tipos alineados con spec/design.
- [x] **TASK-003**: Implementar sistema RBAC y helpers de permisos
  - Files: `aiderbrand-system/apps/web/lib/rbac.ts`
  - Depends on: none
  - Notes: modelar matriz por rol, helpers `hasPermission`, `filterByPermission` y checks por recurso.
- [x] **TASK-004**: Implementar utilidades SLA puras
  - Files: `aiderbrand-system/apps/web/lib/sla.ts`
  - Depends on: none
  - Notes: cubrir deadline, porcentaje, formato y estados visuales sin lógica UI.
- [x] **TASK-005**: Crear seeds mock de compañías, usuarios, proyectos y tickets
  - Files: `aiderbrand-system/apps/web/lib/mock/{companies,users,projects,tickets}.ts`
  - Depends on: TASK-002, TASK-004
  - Notes: incluir 2 compañías, 5 usuarios, 3 proyectos, 10 tickets y 20 comentarios con mezcla sin proyecto.
- [x] **TASK-006**: Crear AuthContext con usuario, compañía y cambio de rol dev
  - Files: `aiderbrand-system/apps/web/contexts/auth-context.tsx`
  - Depends on: TASK-002, TASK-003, TASK-005
  - Notes: exponer `currentUser`, `currentCompany`, `hasPermission` y `switchRole` solo para desarrollo.

## Group 2 — AppShell & Sidebar

- [x] **TASK-007**: Crear layout `(app)` con AppShell y providers
  - Files: `aiderbrand-system/apps/web/app/(app)/layout.tsx`, `aiderbrand-system/apps/web/components/layout/app-shell.tsx`, `aiderbrand-system/apps/web/components/layout/app-header.tsx`
  - Depends on: TASK-001, TASK-006
  - Notes: aislar shell autenticado y preparar header + contenido principal.
- [x] **TASK-008**: Construir sidebar config-driven con filtrado RBAC
  - Files: `aiderbrand-system/apps/web/components/layout/app-sidebar.tsx`, `aiderbrand-system/apps/web/components/layout/sidebar-nav-items.ts`
  - Depends on: TASK-007
  - Notes: incluir secciones, estado activo, mobile collapse y visibilidad por permiso.
- [x] **TASK-009**: Construir breadcrumb dinámico reutilizable
  - Files: `aiderbrand-system/apps/web/components/layout/breadcrumb-nav.tsx`
  - Depends on: TASK-007
  - Notes: derivar desde pathname y soportar contexto global/proyecto.
- [x] **TASK-010**: Redirigir raíz hacia dashboard
  - Files: `aiderbrand-system/apps/web/app/page.tsx`
  - Depends on: TASK-007
  - Notes: usar redirect server-side a `/dashboard`.

## Group 3 — Projects Feature

- [x] **TASK-011**: Definir ProjectService y mock implementation
  - Files: `aiderbrand-system/apps/web/lib/services/project-service.ts`, `aiderbrand-system/apps/web/features/projects/types.ts`
  - Depends on: TASK-005, TASK-006
  - Notes: devolver lista y detalle con stats usando datos mock Company-scoped.
- [x] **TASK-012**: Crear hook `useProjects`
  - Files: `aiderbrand-system/apps/web/features/projects/hooks/use-projects.ts`
  - Depends on: TASK-011
  - Notes: resolver loading, error, refetch y scope por compañía actual.
- [x] **TASK-013**: Crear `ProjectList` presentacional
  - Files: `aiderbrand-system/apps/web/features/projects/components/project-list.tsx`
  - Depends on: TASK-012
  - Notes: mostrar cards limpias con estado y métricas accionables.
- [x] **TASK-014**: Crear `ProjectListContainer`
  - Files: `aiderbrand-system/apps/web/features/projects/components/project-list-container.tsx`, `aiderbrand-system/apps/web/components/shared/empty-state.tsx`
  - Depends on: TASK-012, TASK-013
  - Notes: separar fetching de render y manejar empty/error states.
- [x] **TASK-015**: Crear página `/projects`
  - Files: `aiderbrand-system/apps/web/app/(app)/projects/page.tsx`
  - Depends on: TASK-014, TASK-008
  - Notes: montar container sin lógica en la route.
- [x] **TASK-016**: Crear detalle de proyecto
  - Files: `aiderbrand-system/apps/web/features/projects/components/{project-detail,project-detail-container}.tsx`, `aiderbrand-system/apps/web/app/(app)/projects/[projectId]/page.tsx`
  - Depends on: TASK-012, TASK-009
  - Notes: mostrar overview, stats y acceso a tickets del proyecto.

## Group 4 — Tickets Feature — Foundation

- [x] **TASK-017**: Definir TicketService y mock implementation
  - Files: `aiderbrand-system/apps/web/lib/services/ticket-service.ts`, `aiderbrand-system/apps/web/features/tickets/types.ts`
  - Depends on: TASK-005, TASK-006
  - Notes: incluir list, detail, create, comment, change status y assign.
- [x] **TASK-018**: Crear hooks `useTickets` y `useTicketDetail`
  - Files: `aiderbrand-system/apps/web/features/tickets/hooks/{use-tickets,use-ticket-detail}.ts`
  - Depends on: TASK-017
  - Notes: soportar filtros, refetch y detalle compartido con timeline.
- [x] **TASK-019**: Crear `TicketStatusBadge`
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-status-badge.tsx`
  - Depends on: TASK-001, TASK-002
  - Notes: mapear estados a variantes visuales consistentes.
- [x] **TASK-020**: Crear `TicketPriorityBadge`
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-priority-badge.tsx`
  - Depends on: TASK-001, TASK-002
  - Notes: resaltar urgencia sin hardcodear lógica fuera del componente.
- [x] **TASK-021**: Crear `TicketSlaIndicator`
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-sla-indicator.tsx`
  - Depends on: TASK-001, TASK-004
  - Notes: usar helpers SLA para color, porcentaje y tooltip.

## Group 5 — Ticket List

- [x] **TASK-022**: Crear `TicketList` presentacional con UI de filtros
  - Files: `aiderbrand-system/apps/web/features/tickets/components/{ticket-list,ticket-filters}.tsx`
  - Depends on: TASK-018, TASK-019, TASK-020, TASK-021
  - Notes: incluir filtros por estado, prioridad, asignado y proyecto global.
- [x] **TASK-023**: Crear `TicketListContainer` con filtrado RBAC
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-list-container.tsx`
  - Depends on: TASK-022, TASK-003, TASK-006
  - Notes: aplicar scope company/own/all según rol y preparar acción crear.
- [x] **TASK-024**: Crear página global `/tickets`
  - Files: `aiderbrand-system/apps/web/app/(app)/tickets/page.tsx`
  - Depends on: TASK-023, TASK-008
  - Notes: route delgada que monta el container global.
- [x] **TASK-025**: Crear página `/projects/[projectId]/tickets`
  - Files: `aiderbrand-system/apps/web/app/(app)/projects/[projectId]/tickets/page.tsx`
  - Depends on: TASK-023, TASK-016
  - Notes: reutilizar container con `projectId` opcional.

## Group 6 — Ticket Detail (Conversational)

- [x] **TASK-026**: Modelar `TimelineEvent` y `TimelineItem`
  - Files: `aiderbrand-system/apps/web/features/tickets/types.ts`, `aiderbrand-system/apps/web/features/tickets/components/timeline-item.tsx`
  - Depends on: TASK-017
  - Notes: discriminated union para comentarios y eventos del sistema.
- [x] **TASK-027**: Crear `TicketTimeline`
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-timeline.tsx`
  - Depends on: TASK-026, TASK-001
  - Notes: intercalar comentarios y eventos ordenados cronológicamente.
- [x] **TASK-028**: Crear `TicketReplyBox` con guard de cambios sin guardar
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-reply-box.tsx`, `aiderbrand-system/apps/web/components/shared/unsaved-changes-dialog.tsx`
  - Depends on: TASK-001, TASK-006
  - Notes: advertir al click afuera o navegación con contenido dirty.
- [x] **TASK-029**: Crear `TicketDetailHeader`
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail-header.tsx`
  - Depends on: TASK-019, TASK-020, TASK-021
  - Notes: incluir título, estado, prioridad, SLA y asignado.
- [x] **TASK-030**: Crear `TicketDetail` presentacional
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`
  - Depends on: TASK-027, TASK-028, TASK-029
  - Notes: componer layout conversacional y panel lateral contextual.
- [x] **TASK-031**: Crear `TicketDetailContainer` compartido
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail-container.tsx`
  - Depends on: TASK-018, TASK-030, TASK-003, TASK-009
  - Notes: aceptar `ticketId` y `projectId?`, aplicar RBAC de acciones y breadcrumb.
- [x] **TASK-032**: Crear routes de detalle global y por proyecto
  - Files: `aiderbrand-system/apps/web/app/(app)/tickets/[ticketId]/page.tsx`, `aiderbrand-system/apps/web/app/(app)/projects/[projectId]/tickets/[ticketId]/page.tsx`
  - Depends on: TASK-031
  - Notes: usar params async de Next.js 16 y reutilizar el mismo container.

## Group 7 — Create Ticket

- [x] **TASK-033**: Definir `CreateTicketDTO` y schema Zod
  - Files: `aiderbrand-system/apps/web/features/tickets/types.ts`
  - Depends on: TASK-017
  - Notes: requerir `title` y `priority`; `description`, `projectId` y `assigneeId` opcionales.
- [x] **TASK-034**: Crear `CreateTicketForm` en Sheet
  - Files: `aiderbrand-system/apps/web/features/tickets/components/create-ticket-sheet.tsx`
  - Depends on: TASK-001, TASK-033, TASK-012
  - Notes: validar con Zod y autocalcular SLA al submit.
- [x] **TASK-035**: Conectar acción de creación en `TicketListContainer`
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-list-container.tsx`, `aiderbrand-system/apps/web/lib/services/ticket-service.ts`
  - Depends on: TASK-023, TASK-034
  - Notes: refrescar lista y mantener scope global/proyecto tras crear.
- [x] **TASK-036**: Agregar guard de cambios sin guardar al Sheet
  - Files: `aiderbrand-system/apps/web/features/tickets/components/create-ticket-sheet.tsx`, `aiderbrand-system/apps/web/components/shared/unsaved-changes-dialog.tsx`
  - Depends on: TASK-034
  - Notes: confirmar cierre por backdrop o dismiss si el formulario está dirty.

## Group 8 — Polish & Dev Tools

- [x] **TASK-037**: Crear role switcher dev-only
  - Files: `aiderbrand-system/apps/web/components/layout/app-header.tsx`, `aiderbrand-system/apps/web/contexts/auth-context.tsx`
  - Depends on: TASK-006, TASK-007
  - Notes: visible solo en desarrollo para validar RBAC manualmente.
- [x] **TASK-038**: Crear dashboard con summary cards
  - Files: `aiderbrand-system/apps/web/app/(app)/dashboard/page.tsx`
  - Depends on: TASK-007, TASK-011, TASK-017
  - Notes: mostrar métricas accionables por rol, no placeholders vacíos.
- [x] **TASK-039**: Agregar loading skeletons para listas y detalle
  - Files: `aiderbrand-system/apps/web/features/projects/components/{project-list,project-detail}.tsx`, `aiderbrand-system/apps/web/features/tickets/components/{ticket-list,ticket-detail}.tsx`
  - Depends on: TASK-001, TASK-015, TASK-016, TASK-024, TASK-032
  - Notes: cubrir loading sin saltos visuales ni scroll innecesario.
- [x] **TASK-040**: Completar empty states para vistas sin tickets
  - Files: `aiderbrand-system/apps/web/components/shared/empty-state.tsx`, `aiderbrand-system/apps/web/features/tickets/components/{ticket-list-container,ticket-detail}.tsx`
  - Depends on: TASK-023, TASK-030
  - Notes: diferenciar ausencia de datos vs filtros sin resultados.
- [x] **TASK-041**: Mostrar alertas SLA warning/overdue en detalle
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`
  - Depends on: TASK-021, TASK-030
  - Notes: usar `alert` para warning crítico sin bloquear el flujo principal.
