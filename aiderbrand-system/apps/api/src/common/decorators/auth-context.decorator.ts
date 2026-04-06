import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthContextData, RequestWithAuthContext } from '../types'

export const AuthContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContextData | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuthContext>()
    return request.authContext
  },
)
