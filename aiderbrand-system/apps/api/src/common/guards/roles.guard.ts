import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/require-roles.decorator'
import type { Role } from '../enums/role.enum'
import type { RequestWithAuthContext } from '../types'

/**
 * RolesGuard — checks that the authenticated user's membership role
 * for the active company (set by CompanyMembershipGuard) satisfies
 * the @RequireRoles(...) decorator.
 *
 * Guard chain order: JwtAuthGuard → CompanyMembershipGuard → RolesGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No roles restriction on this endpoint
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthContext>()
    const effectiveRole = request.authContext?.effectiveRole as Role | undefined

    if (!effectiveRole || !requiredRoles.includes(effectiveRole)) {
      throw new ForbiddenException('Insufficient role for this operation')
    }

    return true
  }
}
