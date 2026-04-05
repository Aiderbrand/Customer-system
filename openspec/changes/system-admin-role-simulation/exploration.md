## Exploration: system-admin-role-simulation

### Current State
- La implementación actual YA materializó varios supuestos que ahora quedan inválidos: `RoleSimulationSession` persiste `targetCompanyId`, `StartRoleSimulationDto` exige `targetCompanyId`, `AuthContextGuard` exige `X-Company-Id` en requests protegidos y el `AuthContext` global incluye `effectiveCompanyId`.
- En frontend, `AuthProvider` persiste `activeCompanyId`, `apiClient` inyecta `X-Company-Id` globalmente, y el header muestra `CompanySwitcher` + bloqueo de cambio durante simulación. Eso contradice el nuevo scope: la company NO debe vivir globalmente en auth/header.
- La UX de simulación está incompleta respecto al scope validado: hoy solo existe “finalizar simulación”; no existe el desplegable de rol efectivo en header, y elegir `SYSTEM_ADMIN` no es el mecanismo principal para cerrar simulación.
- `/projects` y `/tickets` todavía NO tienen filtro local por company. Ambos consumen `currentCompany/currentRole` desde auth global y además usan servicios mock (`projectService`, `ticketService`), no endpoints backend reales.
- En backend, `GET /auth/session` y `/auth/simulation` ya no dependen de `X-Company-Id`, pero los endpoints protegidos existentes (`invitations`, `companies`, `users/:id/password-reset-link`) sí siguen dependiendo del header vía `AuthContextGuard`.
- Esto invalida parcialmente artifacts previos del cambio: proposal/spec/design/tasks/verify asumían que la simulación correcta era **rol + company globales**. Con el scope nuevo, la simulación debe quedar **global solo por rol**, y la company debe resolverse localmente por página/endpoint.

### Affected Areas
- `aiderbrand-system/apps/web/components/layout/app-header.tsx` — hoy contiene el selector global de company; debe pasar a selector de rol efectivo para actores con capacidad `SYSTEM_ADMIN`.
- `aiderbrand-system/apps/web/contexts/auth-context.tsx` — hoy mezcla auth global con company global (`activeCompanyId`, `currentCompany`, `switchCompany`, `effectiveCompanyId`); debe separarse en actor/effective role global vs scope local de página.
- `aiderbrand-system/apps/web/lib/api/client.ts` — hoy mantiene `companyIdRef` e inyecta `X-Company-Id` a todo; debe dejar de ser ambient/global.
- `aiderbrand-system/apps/web/lib/api/auth.ts` + `apps/web/lib/types/domain.ts` — el contrato de simulación hoy incluye `targetCompanyId/name/slug`; eso contradice la nueva UX centrada en rol efectivo global.
- `aiderbrand-system/apps/web/features/projects/hooks/use-projects.ts` y `.../project-list-container.tsx` — hoy dependen de `currentCompany`; deberán aceptar filtro local por company para `SYSTEM_ADMIN` efectivo.
- `aiderbrand-system/apps/web/features/tickets/hooks/use-tickets.ts` y `.../ticket-list-container.tsx` — mismo problema: company scope implícito en auth global.
- `aiderbrand-system/apps/api/src/common/guards/company-membership.guard.ts` — hoy resuelve auth + tenancy como una sola cosa y obliga `X-Company-Id`; debe desacoplar `effectiveRole` global de `company scope` local por request.
- `aiderbrand-system/apps/api/src/common/types/auth-context.type.ts` + `company-context.decorator.ts` — hoy modelan `effectiveCompanyId` obligatorio; con el nuevo scope ese dato no puede ser global por default.
- `aiderbrand-system/apps/api/src/auth/dto/start-role-simulation.dto.ts` + `auth-response.dto.ts` + `auth.service.ts` — hoy la sesión de simulación está atada a una company objetivo; hay que redefinir el contrato.
- `aiderbrand-system/apps/api/prisma/schema.prisma` — `RoleSimulationSession.targetCompanyId` queda sospechoso/inválido para la arquitectura nueva; si la simulación es solo por rol, ese acoplamiento debe migrarse o eliminarse.
- `aiderbrand-system/apps/api/src/{invitations,companies,auth/users}.controller.ts` — siguen mostrando el riesgo de coexistencia: endpoints que todavía necesitan company scope explícito mientras se remueve el selector global.

### Approaches
1. **Auth global por rol + scope local por página/endpoint** — mantener global solo `actor*`, `effectiveRole` y estado de simulación; toda company requerida se resuelve localmente por query/path/body o por header enviado solo por el servicio de esa página.
   - Pros: coincide con la UX validada, elimina el error conceptual del selector global, separa RBAC global de tenancy/resource scope y prepara bien `/projects` + `/tickets`.
   - Cons: obliga a refactor real de contratos frontend/backend y deja expuestos los endpoints legacy que hoy dependen de `X-Company-Id`.
   - Effort: High

2. **Puente de compatibilidad temporal** — objetivo final igual al anterior, pero manteniendo `X-Company-Id` solo como contrato explícito de endpoints legacy mientras el frontend deja de guardarlo globalmente y pasa a enviarlo únicamente desde páginas/servicios que lo necesiten.
   - Pros: permite rollout incremental sin romper invitations/companies/users de una; reduce riesgo operativo.
   - Cons: conviven dos modelos por un tiempo y hay que documentar bien qué endpoints siguen legacy.
   - Effort: Medium

3. **Ocultar selector global sin tocar contratos** — sacar el switcher del header pero conservar `activeCompanyId`, `effectiveCompanyId` y simulación atada a company por debajo.
   - Pros: barato y rápido.
   - Cons: contradice el scope validado, deja una company global “fantasma”, mantiene acoplamiento en auth y posterga el problema estructural.
   - Effort: Low

### Recommendation
Recomiendo **Approach 1 como arquitectura objetivo** y **Approach 2 como estrategia de implementación**. En concreto:

- **Auth global** debe exponer solo identidad real, capacidad de simular y `effectiveRole`.
- **Page filters locales** deben decidir la company en `/projects` y `/tickets` cuando el `effectiveRole` sea `SYSTEM_ADMIN`; si el rol efectivo es simulado/no-admin, la UI no debe mostrar filtro multi-company.
- **Backend authz** debe separar dos pasos: (1) resolver actor + rol efectivo global, (2) resolver company scope solo cuando el endpoint lo necesita.
- **Endpoints company-scoped** deben seguir existiendo como company-scoped (`invitations`, futuros `projects`/`tickets`, acceso por recurso), pero NO depender de un selector global en auth/header.
- **Endpoints no company-scoped** no deben pedir company global (`/auth/session`, `/auth/simulation`, login/refresh/logout y acciones sistémicas como listar companies o generar password reset link si la operación no depende del tenant activo).

La corrección estructural clave es esta: el backend no puede seguir modelando `effectiveCompanyId` como parte obligatoria del auth global. La company pasa a ser **scope de request/página**, no **estado ambiente de sesión**.

### Risks
- **Migración de esquema**: la implementación actual persistió `RoleSimulationSession.targetCompanyId`; remover ese acoplamiento requiere migración y compatibilidad de datos.
- **Coexistencia legacy**: si se remueve el selector global antes de mover los callers legacy, endpoints protegidos que aún exigen `X-Company-Id` van a romper en runtime.
- **Ambigüedad para no-admin con múltiples memberships**: sin selector global, los endpoints/listas company-scoped necesitan una regla explícita para resolver company o fallar cerrado. No hay que asumir una “company por defecto” universal.
- **Mock gap**: `/projects` y `/tickets` hoy no prueban el backend real; un refactor solo UI puede dar falsa sensación de cierre si no se define ya el contrato API futuro.
- **Trazabilidad**: al separar role simulation de company scope, auditoría debe registrar ambos contextos cuando existan (`actor`, `effectiveRole`, `scopedCompanyId`, recurso). Si no, se pierde explicabilidad.
- **Artifacts previos desalineados**: proposal/spec/design/tasks/verify viejos no pueden reutilizarse tal cual porque describen una arquitectura de simulación atada a company global.

### Ready for Proposal
Sí, pero el proposal nuevo debe superseder explícitamente los artifacts anteriores y fijar dos reglas sin asumir nada: (1) contrato transicional para endpoints que todavía requieren `X-Company-Id`, y (2) comportamiento fail-closed cuando un flujo company-scoped no tenga company resuelta de forma explícita.
