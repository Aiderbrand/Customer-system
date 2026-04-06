import type { ExecutionContext } from '@nestjs/common'
import { RefreshGuard, type RequestWithRefreshContext } from '../../src/auth/guards/refresh.guard'

describe('RefreshGuard', () => {
  const createExecutionContext = (request: RequestWithRefreshContext): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('extracts the opaque cookie and validates it against DB', async () => {
    const authService = {
      validateRefreshToken: jest.fn().mockResolvedValue({ id: 'rt-1', userId: 'user-1' }),
    }

    const guard = new RefreshGuard(authService as never)
    const request = {
      cookies: { refresh_token: 'opaque-refresh-token' },
    } as RequestWithRefreshContext

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true)

    expect(authService.validateRefreshToken).toHaveBeenCalledWith('opaque-refresh-token')
    expect(request.refreshAuth).toEqual({
      rawToken: 'opaque-refresh-token',
      tokenRecord: { id: 'rt-1', userId: 'user-1' },
    })
  })

  it('allows the request through without a cookie so logout stays idempotent', async () => {
    const authService = {
      validateRefreshToken: jest.fn(),
    }

    const guard = new RefreshGuard(authService as never)
    const request = {
      cookies: {},
    } as RequestWithRefreshContext

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true)

    expect(authService.validateRefreshToken).not.toHaveBeenCalled()
    expect(request.refreshAuth).toEqual({
      rawToken: null,
      tokenRecord: null,
    })
  })

  it('marks invalid opaque tokens without pretending they are JWTs', async () => {
    const authService = {
      validateRefreshToken: jest
        .fn()
        .mockRejectedValue(new Error('Refresh token is invalid or expired')),
    }

    const guard = new RefreshGuard(authService as never)
    const request = {
      cookies: { refresh_token: 'stale-token' },
    } as RequestWithRefreshContext

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true)

    expect(authService.validateRefreshToken).toHaveBeenCalledWith('stale-token')
    expect(request.refreshAuth).toEqual({
      rawToken: 'stale-token',
      tokenRecord: null,
    })
  })
})
