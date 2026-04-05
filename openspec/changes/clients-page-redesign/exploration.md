# Exploration: clients-page-redesign

### Current State
- El selector global de company en header YA no existe: `AppHeader` sólo renderiza breadcrumb, role switcher y logout (`aiderbrand-system/apps/web/components/layout/app-header.tsx`). La sesión se resuelve desde `AuthProvider` y el scope visible para hubs cross-company hoy se modela por URL/query + helpers (`apps/web/contexts/auth-context.tsx`, `apps/web/lib/company-scope.ts`).
- Esto destraba una futura página cross-company `companies`, pero con una condición: no puede depender de `effectiveCompanyId` como scope obligatorio. `route-policy.ts` hoy soporta rutas `scopeMode: 'none' | 'optional-company' | 'required-company'`; `/companies` todavía no existe y debería entrar como `none` u `optional-company`, nunca `required-company`.
- No existe hoy ninguna ruta `/clients` ni `/companies`, tampoco feature module `features/companies` ni service web de companies. La navegación actual sólo expone Dashboard, Tickets y Proyectos (`apps/web/lib/route-policy.ts`, `apps/web/components/layout/sidebar-nav-items.ts`).
- El rename previo asumido por los artifacts quedó viejo: ya no hay `nav:clients` en `rbac.ts` ni labels de clientes en sidebar/breadcrumb. El frontend actual tampoco tiene permisos de navegación para clients/companies; habrá que agregarlos o resolver acceso por route-policy directo.
- Backend real de `companies` existe pero está MUY parcial: sólo `POST /companies` con auditoría `company.created`; repository/service además tienen `findAll`/`findById`, pero no están expuestos por controller (`apps/api/src/companies/**`).
- Invitations sí tiene contratos reales por company (`GET/POST/DELETE /invitations`) y duplicate-pending protection. Memberships sólo existe como service/repository; no hay controller HTTP. Audit es write-only; no existe endpoint de lectura de actividad. No existe módulo backend de `projects` en API.
- Hay una desalineación importante de permisos/tenancy contra el SDD actual: `AuthContextGuard` sólo permite scope cross-company a roles internos SI el actor además tiene capacidad real de `SYSTEM_ADMIN`; un `PROJECT_LEAD` sin esa capacidad no puede operar sobre compañías ajenas a sus memberships. Además `POST /companies` hoy permite crear a `PROJECT_LEAD`, mientras la spec actual lo prohibe.
- En frontend, `resolveScopedCompanyOptions()` abre scope cross-company sólo cuando `actorHasSystemAdminCapability` es true y el rol efectivo es interno; por lo tanto tampoco sirve como base para un hub global visible a `PROJECT_LEAD` si la intención sigue siendo cross-company total.
- Detalle fino pero crítico: `apiClient.setCompanyId()` hoy es un no-op (`apps/web/lib/api/client.ts`). O sea, cualquier integración real futura deberá pasar `companyId` explícitamente por request cuando el endpoint sea company-scoped; no existe “global selector” implícito usable.

### Affected Areas
- `aiderbrand-system/apps/web/components/layout/app-header.tsx` — confirma que el selector global de company fue removido.
- `aiderbrand-system/apps/web/contexts/auth-context.tsx` — la sesión persiste `preferredCompanyId`, calcula `effectiveCompanyId` y ya no depende de selector en header.
- `aiderbrand-system/apps/web/lib/company-scope.ts` — helper actual para opciones/selección cross-company en hubs existentes; hoy privilegia capability de system admin.
- `aiderbrand-system/apps/web/lib/route-policy.ts` — source of truth de rutas/navegación; no existe `clients` ni `companies`.
- `aiderbrand-system/apps/web/lib/rbac.ts` — no hay permisos `nav:clients`/`nav:companies` ni granularidad `companies:*`.
- `aiderbrand-system/apps/web/lib/api/client.ts` — `X-Company-Id` sólo via request explícito; no hay contexto global operativo.
- `aiderbrand-system/apps/api/src/companies/companies.controller.ts` — sólo expone create.
- `aiderbrand-system/apps/api/src/common/guards/company-membership.guard.ts` — tenancy y cross-company actuales que condicionan cualquier spec/apply futuro.
- `aiderbrand-system/apps/api/src/invitations/**` — contratos reales reutilizables para tab/contexto de invitaciones.
- `aiderbrand-system/apps/api/src/memberships/**` — base de dominio existente pero sin superficie HTTP.
- `aiderbrand-system/apps/api/src/audit/audit.service.ts` — auditoría write-only; falta lectura para `Activity` admin-only.
- `aiderbrand-system/apps/api/prisma/schema.prisma` — source of truth: `Company`, `CompanyMembership`, `Invitation`, `AuditLog`; no `Project` persistido.

### Approaches
1. **Ajuste mínimo del apply manteniendo intención del SDD** — conservar `/companies` como hub interno, pero corregir tasks/spec/design para reflejar el código real antes de implementar.
   - Pros: mantiene la dirección funcional, reduce sorpresas en apply, evita implementar sobre supuestos viejos.
   - Cons: requiere tocar artifacts antes de codear.
   - Effort: Low

2. **Aplicar el SDD actual sin correcciones previas** — implementar según proposal/spec/design/tasks tal como están.
   - Pros: cero trabajo previo en artifacts.
   - Cons: alto riesgo de romper consistencia: parte del plan asume `/clients`, `nav:clients`, projects backend existente y PROJECT_LEAD cross-company total, nada de eso coincide hoy con el repo.
   - Effort: Medium

### Recommendation
Recomiendo **Approach 1**. El cambio sigue teniendo sentido como hub `/companies`, pero el próximo `sdd-apply` debería arrancar con un ajuste corto de artifacts: abandonar por completo la narrativa de `/clients` como ruta real, explicitar que el selector global ya fue removido, y decidir si `PROJECT_LEAD` opera sólo sobre compañías donde tiene membership o si de verdad se cambia el modelo de tenancy actual.

### Risks
- El SDD habla de `/clients` muerto y `nav:clients`, pero el código actual no tiene ni ruta ni permiso; si el apply sigue ese texto, va a implementar sobre una baseline falsa.
- La spec actual da capacidades cross-company operativas a `PROJECT_LEAD`, pero el guard backend y los helpers frontend no soportan eso salvo que el actor tenga capacidad real de system admin.
- La task 2.7 asume backend `projects/**`; hoy no existe módulo API de projects ni modelo Prisma para eso.
- La tab `Activity` admin-only no puede salir sólo “extendiendo audit”; hoy no hay read model ni endpoint de lectura.
- Si el frontend nuevo intenta confiar en `apiClient.setCompanyId`, va a fallar: hoy no persiste company scope global.

### Ready for Proposal
Yes — pero antes del próximo `sdd-apply` hay que alinear artifacts con tres verdades del repo: (1) canonical route = `/companies`, no `/clients`; (2) no existe backend real de projects para link/create en API; (3) hay que decidir si se mantiene tenancy actual para `PROJECT_LEAD` o se rediseña explícitamente.
