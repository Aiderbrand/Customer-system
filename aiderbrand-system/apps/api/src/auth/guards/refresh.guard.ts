import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from '../auth.service'

/**
 * RefreshGuard — extracts the opaque refresh cookie and validates it against DB.
 *
 * Apply only on POST /auth/refresh and POST /auth/logout.
 *
 * It NEVER treats the cookie as a JWT. The token is opaque by design and the
 * hash/revocation check lives in the persistence layer.
 */
@Injectable()
export class RefreshGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithRefreshContext>()
    const rawToken = request.cookies?.['refresh_token'] ?? null

    if (!rawToken) {
      request.refreshAuth = {
        rawToken: null,
        tokenRecord: null,
      }

      return true
    }

    const tokenRecord = await this.authService.validateRefreshToken(rawToken).catch(() => null)

    request.refreshAuth = {
      rawToken,
      tokenRecord,
    }

    return true
  }
}

export interface RequestWithRefreshContext extends Request {
  refreshAuth?: {
    rawToken: string | null
    tokenRecord: { id: string; userId: string } | null
  }
}
