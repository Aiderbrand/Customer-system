import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 * Set by JwtAuthGuard after token validation.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>()
    return request.user
  },
)
