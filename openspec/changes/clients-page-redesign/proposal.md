# Proposal: Clients Page Redesign

## Intent

Reemplazar la navegación rota de `/clients` por un hub operativo real sobre `Company`. El cambio busca centralizar gestión interna de cuentas, miembros e invitaciones con contratos backend reales, manteniendo tenancy estricta, RBAC explícito y trazabilidad auditable.

## Scope

### In Scope
- Listado `table-first` de `Company` con búsqueda/filtros y KPIs mínimos útiles.
- Crear/editar `Company`, activar/desactivar y ver actividad/auditoría.
- Invitar miembros desde la cuenta y mostrar estado operativo relacionado.
- Vincular proyectos existentes o disparar creación de proyecto desde la cuenta.
- UX opción B: hub + members; tickets quedan implícitos por `companyId`, sin vínculo manual.
- Recomendación de naming visible: migrar pantalla y labels a **Companies**; mantener `clients-page-redesign` como id del cambio por continuidad.

### Out of Scope
- CRM comercial, health scores, métricas financieras, owner comercial o timeline inventada.
- Workspace full-depth con detalle monstruoso o tabs no respaldadas por backend.
- Vinculación manual de tickets o nuevas entidades ajenas a `Company`, `Invitation`, `CompanyMembership`, `AuditLog`.

## Approach

Extender `apps/api` desde `companies` para lectura/listado/update/activate-deactivate y trazabilidad, reutilizando guards `JwtAuthGuard -> AuthContextGuard -> RolesGuard`. Exponer miembros/proyectos sólo con contratos mínimos necesarios. En `apps/web`, crear `/clients` como hub premium útil: header fuerte, KPIs mínimos, filtros, data-table principal, panel/contexto de members y acciones rápidas; premium = densidad informativa, jerarquía clara y deep actions, NO decoración.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `aiderbrand-system/apps/api/src/companies/**` | Modified | CRUD read/update/status + audit activity surface |
| `aiderbrand-system/apps/api/src/memberships/**` | Modified | Read model para members por company |
| `aiderbrand-system/apps/api/src/invitations/**` | Modified | Reuso de invitaciones dentro del hub |
| `aiderbrand-system/apps/api/prisma/schema.prisma` | Modified | Confirmar soporte de estados/relaciones sin inventar modelo |
| `aiderbrand-system/apps/web/app/(app)/clients/**` | New | Ruta real del hub |
| `aiderbrand-system/apps/web/features/clients/**` | New | Data-table, panel members, actions, adapters |
| `aiderbrand-system/apps/web/lib/rbac.ts` | Modified | Permisos finos más allá de `nav:clients` |
| `aiderbrand-system/apps/web/components/layout/**` | Modified | Naming Clients/Companies consistente |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep hub→workspace | Med | Limitar v1 a hub + members |
| RBAC insuficiente hoy | High | Definir permisos por acción antes de spec |
| Link con proyectos ambiguo | Med | Especificar si es asociación, filtro o shortcut de creación |
| Auditoría incompleta en nuevas acciones | Med | Evento auditable por create/edit/invite/status/link |

## Rollback Plan

Revertir ruta `/clients` al estado no expuesto, retirar permisos/UI nuevos, dejar endpoints nuevos sin uso y revertir migraciones/ajustes Prisma sólo si agregan estructura. Si el riesgo aparece en producción, mantener naming anterior en navegación y deshabilitar acciones mutantes por feature flag/permisos.

## Dependencies

- Definir matriz RBAC por acción (`view`, `create`, `edit`, `invite`, `status`, `audit`, `projects`).
- Confirmar flujo exacto de vincular proyecto desde company.

## Success Criteria

- [ ] `/clients` deja de ser navegación muerta y opera sobre `Company` real.
- [ ] V1 cubre listado, filtros, create/edit, invite, status, auditoría y projects sin romper tenancy.
- [ ] Naming visible queda consistente y auditado entre sidebar, breadcrumb y pantalla.
