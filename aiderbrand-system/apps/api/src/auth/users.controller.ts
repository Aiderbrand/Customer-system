import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequireRoles } from '../common/decorators/require-roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CompanyContext } from '../common/decorators/company-context.decorator'
import { AuthContext } from '../common/decorators/auth-context.decorator'
import { Role } from '../common/enums/role.enum'
import type { JwtPayload } from '../common/types/jwt-payload.type'
import type { AuthContextData } from '../common/types'

/**
 * UsersController (within AuthModule) — user management endpoints that depend on AuthService.
 *
 * Lives in AuthModule to avoid circular dependencies:
 *   UsersModule ← AuthModule (AuthModule imports UsersModule)
 *   If UsersController were in UsersModule and needed AuthService, it would need AuthModule → circular.
 *
 * Route: /users/:userId/password-reset-link
 *
 * Guard chain: JwtAuthGuard → CompanyMembershipGuard → RolesGuard
 * Note: CompanyMembershipGuard requires X-Company-Id header.
 * The SYSTEM_ADMIN performing this action must have a membership in some company context,
 * or alternatively we could relax the guard for SYSTEM_ADMINs (they operate cross-company).
 *
 * Design decision: SYSTEM_ADMINs always have at least one company membership.
 * If in the future we need cross-company admin endpoints without X-Company-Id,
 * we can introduce a separate AdminGuard.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /users/:userId/password-reset-link
   *
   * SYSTEM_ADMIN only. Generates a password reset URL for any user and returns it.
   * Does NOT send an email — the admin receives the URL directly to share manually.
   *
   * Audit log: 'password_reset_link.generated' with actor (admin) and target user metadata.
   *
   * Required headers:
   * - Authorization: Bearer <access_token>
   * - X-Company-Id: <companyId> (must be a company where the admin has SYSTEM_ADMIN role)
   */
  @Post(':userId/password-reset-link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @RequireRoles(Role.SYSTEM_ADMIN)
  async generatePasswordResetLink(
    @Param('userId') targetUserId: string,
    @CurrentUser() currentUser: JwtPayload,
    @CompanyContext() companyId: string,
    @AuthContext() authContext: AuthContextData,
  ): Promise<{ resetUrl: string }> {
    return this.authService.generateAdminResetLink(currentUser.sub, targetUserId, companyId, authContext)
  }
}
