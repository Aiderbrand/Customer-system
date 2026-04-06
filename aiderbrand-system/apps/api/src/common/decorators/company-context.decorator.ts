import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { RequestWithAuthContext } from '../types'

/**
 * @CompanyContext() — extracts the validated companyId from the request.
 * Set by CompanyMembershipGuard after validating the X-Company-Id header
 * against the authenticated user's memberships.
 *
 * Usage:
 *   @Get('data')
 *   getData(@CompanyContext() companyId: string) { ... }
 */
export const CompanyContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuthContext>()
    return request.authContext?.scopedCompanyId
  },
)
