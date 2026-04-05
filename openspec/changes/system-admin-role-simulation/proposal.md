# Proposal: System Admin Role Simulation

## Intent

Corregir el diseño previo: la simulación debe ser global solo por rol y la company debe resolverse localmente por página/request. El objetivo es eliminar la dependencia estructural del selector global de company del header sin relajar multi-tenant, RBAC ni auditoría.

## Scope

### In Scope
- Eliminar el selector global de company del header.
- Mantener simulación solo para actores con capacidad real `SYSTEM_ADMIN`, expuesta como dropdown de rol en header; elegir `SYSTEM_ADMIN` cierra la simulación.
- Mover el scope de company a filtros locales en `/projects` y `/tickets`, mostrando items visibles según rol/asignaciones y filtro multi-company solo cuando aplique.
- Separar en backend `effectiveRole` global de `company scope` por request, manteniendo fail-closed cuando falte company explícita en flujos company-scoped.
- Mantener auditoría con `actor`, `effectiveRole`, `scopedCompanyId` y recurso cuando corresponda.

### Out of Scope
- Resolver todos los endpoints legacy en un único batch.
- Asumir company default para usuarios con memberships múltiples.
- Rehacer ahora los dominios completos de projects/tickets más allá del contrato necesario.

## Approach

Arquitectura objetivo: **rol global + company local**. Estrategia recomendada: rollout en batches con puente transicional para endpoints que aún requieren `X-Company-Id`, pero enviado solo desde páginas/servicios concretos. Queda obsoleto el diseño previo que asumía simulación atada a `targetCompanyId`, `effectiveCompanyId` global, `activeCompanyId` en auth y `CompanySwitcher` en header.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/components/layout/app-header.tsx` | Modified | Remover switcher global y agregar dropdown de rol efectivo |
| `apps/web/contexts/auth-context.tsx` | Modified | Quitar company global del estado auth |
| `apps/web/lib/api/client.ts` | Modified | Eliminar inyección global de `X-Company-Id` |
| `apps/web/features/{projects,tickets}` | Modified | Filtros locales por company y listas role-aware |
| `apps/api/src/common/{guards,decorators,types}` | Modified | Separar auth global de company scope |
| `apps/api/src/auth/**/*` + `prisma/schema.prisma` | Modified | Desacoplar simulación de `targetCompanyId` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ruptura en endpoints legacy | High | Batch puente y contrato explícito por endpoint |
| Fuga cross-tenant | High | Fail-closed + validación backend por recurso/company |
| Huecos de trazabilidad | Med | Auditoría obligatoria con actor/effective/scoped context |

## Rollback Plan

Reponer header/auth global previos y mantener temporalmente el contrato legacy con `X-Company-Id` mientras se revierte el desacople backend.

## Dependencies

- Exploración actualizada `sdd/system-admin-role-simulation/explore`
- Definir contratos API locales para `/projects` y `/tickets`

## Success Criteria

- [ ] El header no controla company global ni tenancy.
- [ ] Solo `SYSTEM_ADMIN` puede simular roles desde header y volver a `SYSTEM_ADMIN` cierra simulación.
- [ ] `/projects` y `/tickets` resuelven company localmente y fallan cerrado sin scope explícito cuando corresponda.
- [ ] La API funciona sin depender de selector global de company.
