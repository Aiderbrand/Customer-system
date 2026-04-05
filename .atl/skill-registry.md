# Skill Registry — Aiderbrand-gestion

## Purpose
Registro operativo para resolver skills y convenciones del proyecto antes de cada fase SDD.

## Project Conventions

### Indexed Sources
- `AGENTS.md` — reglas estrictas, arquitectura, seguridad, testing e interacción.

### Additional Context Sources
- `PROJECT_SPEC.md` — dominio, entidades, roles, módulos, estados, SLA y trazabilidad.
- `openspec/config.yaml` — contexto SDD previo en disco; preservado porque el modo activo preferido es `engram`.

### Compact Rules
- No inventar lógica ni asumir campos o estructuras.
- Consistencia > velocidad; escalabilidad > soluciones rápidas; backend sólido > UI prematura.
- Frenar y consultar si una decisión afecta consistencia, escalabilidad o trazabilidad.
- Backend modular con controller/service/repository; DTO validation obligatoria.
- Multi-tenant estricto por `Company`; RBAC, sanitización y acceso por recurso resueltos en backend.
- Auditoría obligatoria para acciones relevantes; estados explícitos y controlados desde backend.
- Frontend desacoplado con container/presentational, hooks reutilizables y uso de componentes existentes cuando aplique.
- Output directo y conciso; preguntar ante ambigüedad crítica.

## Detected Stack Signals
- Root liviano con `package.json` para tooling y `shadcn`; implementación principal en `aiderbrand-system/`.
- Monorepo Node.js `>=20` con `npm` workspaces + Turborepo (`aiderbrand-system/package.json`).
- API: NestJS 10 + Prisma ORM + PostgreSQL + JWT/cookies + ValidationPipe global (`apps/api/package.json`, `apps/api/src/main.ts`, `apps/api/prisma/schema.prisma`).
- Backend ya sigue módulos + controller/service/repository + guards + audit log transaccional (`apps/api/src/**`).
- Web: Next.js 16 + React 19 + Vitest + Testing Library; patrón container/presentational y hooks (`apps/web/package.json`, `apps/web/**/*.tsx`).
- UI: `@workspace/ui` + Tailwind v4 + Radix Nova + `components.json`; hay skill local `shadcn` para gobernar UI.
- Calidad: ESLint compartido/flat + Prettier sin semicolons, comillas dobles y plugin Tailwind.

## Available Skills

| Skill | Resolution | Source | Trigger / Use |
|---|---|---|---|
| `shadcn` | project-level wins | `.agents/skills/shadcn/SKILL.md` | Cargar cuando exista `components.json` o haya trabajo con shadcn/ui, registries, presets o composición UI. |
| `branch-pr` | user-level | `~/.config/opencode/skills/branch-pr/SKILL.md` | Crear PR, abrir PR o preparar una branch para review. |
| `issue-creation` | user-level | `~/.config/opencode/skills/issue-creation/SKILL.md` | Crear issue, reportar bug o pedir feature. |
| `go-testing` | user-level | `~/.config/opencode/skills/go-testing/SKILL.md` | Tests en Go, Bubbletea o cobertura Go. |
| `judgment-day` | user-level | `~/.config/opencode/skills/judgment-day/SKILL.md` | Dual review adversarial cuando el usuario use el trigger explícito. |
| `find-skills` | user-level | `~/.agents/skills/find-skills/SKILL.md` | Descubrir/instalar skills cuando el usuario pregunte por capacidades o skills disponibles. |
| `skill-creator` | user-level | `~/.config/opencode/skills/skill-creator/SKILL.md` | Crear nuevas skills o documentar patrones para AI. |

## Skill Resolution Hints
- `aiderbrand-system/apps/api/src/**/*.ts` → priorizar tenancy, RBAC, guards, DTO validation, repository/service layers y auditoría.
- `aiderbrand-system/apps/api/prisma/**` → validar UUIDs, soft delete, relaciones explícitas, auditabilidad y compatibilidad multi-tenant.
- `aiderbrand-system/apps/web/**/*.tsx` + `aiderbrand-system/apps/web/components.json` → cargar `shadcn` ANTES de tocar UI.
- Cambios en auth, memberships, invitations o role simulation → revisar impacto en permisos, company context, tokens y audit logs.
- Requests sobre PRs/issues → resolver con `branch-pr` o `issue-creation`.
- Si el usuario pide una capability nueva o pregunta por skills → resolver con `find-skills` o `skill-creator`.

## Notes
- Se detectó `openspec/` existente en el root. En esta normalización SDD se mantuvo intacto y el backend activo preferido quedó en `engram`.
