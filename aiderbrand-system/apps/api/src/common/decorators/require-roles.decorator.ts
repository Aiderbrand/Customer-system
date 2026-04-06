import { SetMetadata } from '@nestjs/common'
import type { Role } from '../enums/role.enum'

export const ROLES_KEY = 'roles'

/**
 * @RequireRoles(...roles) — declares which roles can access an endpoint.
 * Enforced by RolesGuard (which checks membership role for the active company).
 *
 * Usage:
 *   @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD)
 *   @Get('sensitive')
 *   sensitiveAction() { ... }
 */
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
