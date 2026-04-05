# Exploration: projects-page-redesign

## Current State

- `/projects` sigue siendo una shell mínima (`apps/web/app/(app)/projects/page.tsx`) que delega en `ProjectListContainer`.
- El hub actual (`apps/web/features/projects/components/projects-hub.tsx`) es table-first, con summary cards, filtros y acciones de navegación, pero **sin CTA real de creación**. `useProjectsHub()` calcula `canCreateProject` desde RBAC (`apps/web/features/projects/hooks/use-projects.ts:253`), pero ese flag no se usa en ningún componente.
- En frontend, RBAC sí permite `projects:create` para `SYSTEM_ADMIN` y `PROJECT_LEAD` (`apps/web/lib/rbac.ts`), o sea que la inconsistencia reportada hoy viene de implementación/UI, no de la matriz frontend.
- El servicio de proyectos es **100% mock/local** (`apps/web/lib/services/project-service.ts`). Tiene `createProject()`, pero sólo agrega un objeto básico `{ id, companyId, name, description, status }`; no asigna lead, delivery, cliente, equipo ni fases.
- En backend **no existe módulo Projects**: `apps/api/src/app.module.ts` sólo registra auth, companies, memberships, users, invitations y audit. En Prisma (`apps/api/prisma/schema.prisma`) tampoco existen `Project`, `ProjectPhase`, `ProjectAssignment` ni tablas equivalentes.
- El flujo actual de visibilidad se apoya en `companyId` + rol + flags de fixture: fases via `isClientVisible` y tareas via `visibleToClient` (`apps/web/lib/mock/project-workspaces.ts`). No hay asignación explícita de proyecto a cliente/equipo; tampoco existe relación proyecto↔miembros.
- Sí existe metadata operativa mínima en el workspace mock: `internal.admin.projectLeadId` y `deliveryOwnerId`, pero sólo como parte del payload UI (`apps/web/lib/types/domain.ts`, `apps/web/lib/mock/project-workspaces.ts`). No hay persistencia ni API para modificarlo.
- Las fases hoy son **read-only**: `ProjectPhasesSection` sólo renderiza colapsables; `ProjectEditDialog` deja elegir `currentPhase` entre fases existentes, pero no crear/editar/publicar fases.
- La IA actual del detail duplica contexto: header con estado/fase/updated, 4 KPI cards, tab `Resumen` (`project-overview-section.tsx`) con “Resumen operativo”, y tab interna `Vista general` (`project-general-section.tsx`) con responsables/acciones. La redundancia que marcó el usuario es real.
- No encontré una pieza identificada literalmente como “cards @”; lo más cercano en código a ese ruido/redundancia son las quick-link cards de `ProjectOverviewSection` y las cards de overview del detail.

## Affected Areas

- `aiderbrand-system/apps/web/lib/rbac.ts` — permisos actuales de creación/edición y tabs internas.
- `aiderbrand-system/apps/web/features/projects/hooks/use-projects.ts` — deriva `canCreateProject`, tabs visibles y carga del hub/workspace.
- `aiderbrand-system/apps/web/features/projects/components/projects-hub.tsx` — header/listado actual del hub; lugar natural para CTA y consolidación de summary/listado.
- `aiderbrand-system/apps/web/features/projects/components/project-detail.tsx` — composición actual del workspace y duplicación de resumen/vista general.
- `aiderbrand-system/apps/web/features/projects/components/project-overview-section.tsx` — resumen actual con quick links que podrían integrarse.
- `aiderbrand-system/apps/web/features/projects/components/project-general-section.tsx` — tab interna “Vista general” hoy redundante con resumen/header.
- `aiderbrand-system/apps/web/features/projects/components/project-phases-section.tsx` — soporte sólo de lectura para fases y tareas por fase.
- `aiderbrand-system/apps/web/features/projects/components/project-edit-dialog.tsx` — edición parcial del proyecto sin gestión de responsables ni fases.
- `aiderbrand-system/apps/web/lib/types/domain.ts` — contrato actual insuficiente para assignments y CRUD de fases.
- `aiderbrand-system/apps/web/lib/services/project-service.ts` + `apps/web/lib/mock/project-workspaces.ts` — source of truth actual mock-only.
- `aiderbrand-system/apps/api/prisma/schema.prisma` + `apps/api/src/app.module.ts` — gap estructural: no existe backend real para proyectos.
- `aiderbrand-system/apps/api/src/common/guards/company-membership.guard.ts` / `audit/audit.service.ts` — restricciones que cualquier implementación nueva debe respetar: tenancy por company y auditoría.

## Approaches

1. **Rediseño sólo frontend sobre mocks** — limpiar IA, consolidar tabs/cards y agregar CTA condicional sin tocar backend.
   - Pros: rápido para validar UX, bajo costo inicial, poco riesgo visual.
   - Cons: NO resuelve permisos reales, asignación automática ni CRUD de fases; deja la inconsistencia central intacta.
   - Effort: Low

2. **Rediseño funcional backend-first + IA consolidada** — definir contrato real de proyectos/asignaciones/fases en API y luego rediseñar el workspace sobre esos payloads.
   - Pros: ataca la causa raíz; permite corregir creación para `SYSTEM_ADMIN`/`PROJECT_LEAD`, assignment automático, phase CRUD y auditoría desde backend.
   - Cons: mayor alcance; ya no es un cambio puramente de UI.
   - Effort: High

3. **Workspace único role-aware, pero por etapas** — primero cerrar contratos mínimos (create project + assignments + phases read/write), después consolidar resumen/vista general y simplificar cards.
   - Pros: balancea riesgo y valor; mantiene una sola página consistente; evita rediseñar sobre contratos falsos.
   - Cons: requiere proposal bien cortada en fases para no mezclar demasiado scope en una sola tanda.
   - Effort: Medium

## Recommendation

Recomiendo **Approach 3**.

La base del rediseño tiene que ser un **workspace único role-aware**, pero con un primer corte funcional backend-first en lo mínimo indispensable:

- habilitar creación real sólo para `SYSTEM_ADMIN` y `PROJECT_LEAD`;
- modelar assignment explícito de `deliveryOwner` y alcance de cliente/equipo del proyecto;
- agregar soporte real para fases por proyecto (al menos list/create/update);
- recién después consolidar `Resumen` + `Vista general` en una sola sección canónica.

En UI, la dirección correcta es:

- `/projects`: hub con CTA `Nuevo proyecto` visible sólo para roles permitidos y listado más orientado a decisión que a navegación dispersa;
- `/projects/[id]`: dejar `Resumen` como verdad canónica, absorber ahí responsables/acciones/contexto, y eliminar la tab `Vista general` como entidad separada;
- integrar las quick-link/action cards dentro del resumen/header en vez de seguir sumando bloques paralelos.

## Risks

- **Scope creep**: el pedido parece UX, pero el código real muestra ausencia de backend de proyectos; si no se reconoce eso en proposal, el cambio nace roto.
- **Semántica de assignment no definida**: hoy no existe modelo explícito para “cliente y su equipo” vs “delivery asignado”; hay que cerrarlo antes de spec.
- **Tenancy/RBAC**: cualquier create/update debe pasar por guards de company membership y roles backend; resolverlo sólo en frontend rompería seguridad.
- **Auditoría**: creación de proyecto, asignación de delivery y cambios de fases tienen que auditarse como acciones relevantes.
- **Redundancia UX**: si se consolida mal, se puede mezclar contexto compartido con controles internos y volver a generar ruido.

## Ready for Proposal

Yes — pero la propuesta tiene que declarar explícitamente que este cambio incluye **base backend + contrato frontend**, no sólo maquillaje visual. Si querés mantener scope controlado, conviene partirla en: (1) foundations funcionales de proyecto, assignments y fases; (2) rediseño IA/UX del hub y workspace.
