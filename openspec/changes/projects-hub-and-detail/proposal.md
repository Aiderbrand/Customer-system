# Proposal: Projects Hub and Operational Detail

## Intent

Hoy `/projects` es una grilla básica y `/projects/[projectId]` muestra sólo nombre, estado y tickets. Eso no cumple el objetivo del producto: dar visibilidad profesional a clientes y control operativo al equipo interno, con límites claros por rol.

## Scope

### In Scope
- Rediseñar `/projects` como hub con resumen, búsqueda, estados y acceso rápido a tickets del proyecto.
- Rediseñar `/projects/[projectId]` como detail operacional con header, KPIs, estado, contexto y CTA hacia tickets.
- Definir visibilidad por rol para clientes vs equipo interno sin exponer tareas, notas internas ni tiempos.
- Mantener el lenguaje visual actual: cards, badges, tablas limpias, density moderada y CTA claros.

### Out of Scope
- CRUD completo de proyectos, fases, tareas o propuestas.
- Timeline avanzada, edición inline, analytics históricos o automatizaciones.
- Cambios backend profundos más allá de soportar el payload mínimo del hub/detail.

## Approach

Tomar la base actual de dashboard/tickets y evolucionar el módulo de projects con patrón container/presentational. El hub prioriza escaneo y estado; el detail prioriza operación diaria. V1 debe separar explícitamente lo visible para cliente de lo visible para roles internos, respetando RBAC y multi-tenant.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `aiderbrand-system/apps/web/app/(app)/projects/page.tsx` | Modified | Nueva shell del hub |
| `aiderbrand-system/apps/web/app/(app)/projects/[projectId]/page.tsx` | Modified | Nueva shell del detail |
| `aiderbrand-system/apps/web/features/projects/components/*` | Modified | Cards, KPIs, header, secciones y estados vacíos |
| `aiderbrand-system/apps/web/features/projects/hooks/use-projects.ts` | Modified | Payload y derivaciones para hub/detail |
| `aiderbrand-system/apps/web/lib/services/project-service.ts` | Modified | Datos mínimos del nuevo diseño |
| `aiderbrand-system/apps/web/lib/rbac.ts` | Modified | Reglas de visibilidad por rol |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mezclar vistas cliente/internas | Med | Matriz explícita por rol y sección |
| Falta de datos para el detail | Med | Definir V1 con payload mínimo y placeholders controlados |
| Sobrecargar UI | Low | Reusar patrones actuales y jerarquía simple |

## Rollback Plan

Restaurar `projects/page.tsx`, `[projectId]/page.tsx` y componentes actuales; mantener contrato anterior del servicio si el rediseño degrada navegación o permisos.

## Dependencies

- `PROJECT_SPEC.md`
- Exploración mínima del código actual de projects/dashboard/tickets

## Success Criteria

- [ ] `/projects` funciona como hub escaneable para clientes e internos.
- [ ] `/projects/[projectId]` muestra contexto operacional útil sin exponer información restringida.
- [ ] La visibilidad por rol queda definida para ACCOUNT_OWNER, COLLABORATOR, SYSTEM_ADMIN, PROJECT_LEAD y DELIVERY_SPECIALIST.
- [ ] El diseño conserva el estilo visual actual y mejora claridad/navegación.
