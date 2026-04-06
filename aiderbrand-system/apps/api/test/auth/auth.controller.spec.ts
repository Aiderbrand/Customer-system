import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { AuthController } from '../../src/auth/auth.controller'

describe('AuthController', () => {
  const createResponse = (): Response =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as Response

  const createConfigService = (nodeEnv: 'development' | 'production' = 'development') =>
    ({
      get: jest.fn((key: string) => {
        if (key === 'app.nodeEnv') return nodeEnv
        return undefined
      }),
    }) as unknown as ConfigService

  const createAuthService = () => ({
    login: jest.fn(),
    validateRefreshToken: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getSession: jest.fn(),
    startRoleSimulation: jest.fn(),
    stopRoleSimulation: jest.fn(),
    forgotPassword: jest.fn(),
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sets the refresh cookie and returns the login payload on successful login', async () => {
    const authService = createAuthService()
    authService.login.mockResolvedValue({
      response: {
        accessToken: 'access-token',
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Ada Lovelace',
          avatarUrl: null,
        },
        memberships: [
          {
            companyId: 'company-1',
            companyName: 'Aiderbrand',
            companySlug: 'aiderbrand',
            role: 'ACCOUNT_OWNER',
            isActive: true,
          },
        ],
      },
      rawRefreshToken: 'refresh-token',
    })

    const controller = new AuthController(authService as never, createConfigService())
    const res = createResponse()

    const result = await controller.login(
      { email: 'user@example.com', password: 'Password123!' },
      res,
    )

    expect(result.accessToken).toBe('access-token')
    expect(authService.login).toHaveBeenCalledWith('user@example.com', 'Password123!')
    expect((res.cookie as jest.Mock)).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/v1/auth',
      }),
    )
  })

  it('bubbles invalid credential errors without mutating cookies', async () => {
    const authService = createAuthService()
    authService.login.mockRejectedValue(new UnauthorizedException('Invalid email or password'))

    const controller = new AuthController(authService as never, createConfigService())
    const res = createResponse()

    await expect(
      controller.login({ email: 'user@example.com', password: 'wrong-password' }, res),
    ).rejects.toThrow(UnauthorizedException)

    expect(res.cookie).not.toHaveBeenCalled()
  })

  it('rotates refresh tokens on refresh and issues a new cookie', async () => {
    const authService = createAuthService()
    authService.refresh.mockResolvedValue({
      accessToken: 'next-access-token',
      rawRefreshToken: 'next-refresh-token',
    })

    const controller = new AuthController(authService as never, createConfigService())
    const req = {
      refreshAuth: {
        rawToken: 'current-refresh-token',
        tokenRecord: { id: 'rt-1', userId: 'user-1' },
      },
    } as unknown as Request
    const res = createResponse()

    const result = await controller.refresh(req, res)

    expect(result).toEqual({ accessToken: 'next-access-token' })
    expect(authService.refresh).toHaveBeenCalledWith(
      'user-1',
      'current-refresh-token',
      'rt-1',
    )
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'next-refresh-token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    )
  })

  it('revokes a valid refresh token and clears the cookie on logout', async () => {
    const authService = createAuthService()

    const controller = new AuthController(authService as never, createConfigService('production'))
    const req = {
      refreshAuth: {
        rawToken: 'refresh-token',
        tokenRecord: { id: 'rt-1', userId: 'user-1' },
      },
    } as unknown as Request
    const res = createResponse()

    await controller.logout(req, res)

    expect(authService.logout).toHaveBeenCalledWith('rt-1', 'user-1')
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/v1/auth',
      }),
    )
  })

  it('clears the cookie and stays idempotent on logout without a valid refresh token', async () => {
    const authService = createAuthService()

    const controller = new AuthController(authService as never, createConfigService())
    const req = {
      refreshAuth: {
        rawToken: 'stale-token',
        tokenRecord: null,
      },
    } as unknown as Request
    const res = createResponse()

    await controller.logout(req, res)

    expect(authService.logout).not.toHaveBeenCalled()
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    )
  })

  it('rejects refresh when the opaque cookie was not validated against DB', async () => {
    const authService = createAuthService()

    const controller = new AuthController(authService as never, createConfigService())
    const req = {
      refreshAuth: {
        rawToken: 'stale-token',
        tokenRecord: null,
      },
    } as unknown as Request
    const res = createResponse()

    await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException)
    expect(authService.refresh).not.toHaveBeenCalled()
    expect(res.cookie).not.toHaveBeenCalled()
  })

  it('rejects self-registration explicitly', () => {
    const controller = new AuthController(createAuthService() as never, createConfigService())

    expect(() => controller.registerDisabled()).toThrow(ForbiddenException)
  })

  it('returns the enriched auth session payload', async () => {
    const authService = createAuthService()
    authService.getSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        avatarUrl: null,
      },
      memberships: [],
      actor: {
        hasSystemAdminCapability: true,
        scope: {
          membershipCompanyIds: [],
          realDataCompanyIds: [],
        },
      },
      effective: { companyId: null, role: 'PROJECT_LEAD' },
      simulation: {
        sessionId: 'sim-1',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date().toISOString(),
      },
    })

    const controller = new AuthController(authService as never, createConfigService())

    await expect(
      controller.getSession({ sub: 'user-1', email: 'admin@example.com', type: 'access' }),
    ).resolves.toEqual(
      expect.objectContaining({
        actor: {
          hasSystemAdminCapability: true,
          scope: {
            membershipCompanyIds: [],
            realDataCompanyIds: [],
          },
        },
        simulation: expect.objectContaining({ sessionId: 'sim-1' }),
      }),
    )
  })

  it('starts role simulation through the auth service', async () => {
    const authService = createAuthService()
    authService.startRoleSimulation.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        avatarUrl: null,
      },
      memberships: [],
      actor: {
        hasSystemAdminCapability: true,
        scope: {
          membershipCompanyIds: [],
          realDataCompanyIds: [],
        },
      },
      effective: { companyId: null, role: 'ACCOUNT_OWNER' },
      simulation: {
        sessionId: 'sim-1',
        effectiveRole: 'ACCOUNT_OWNER',
        startedAt: new Date().toISOString(),
      },
    })

    const controller = new AuthController(authService as never, createConfigService())

    await controller.startRoleSimulation(
      { sub: 'user-1', email: 'admin@example.com', type: 'access' },
      { effectiveRole: 'ACCOUNT_OWNER' },
    )

    expect(authService.startRoleSimulation).toHaveBeenCalledWith('user-1', {
      effectiveRole: 'ACCOUNT_OWNER',
    })
  })

  it('stops role simulation through the auth service', async () => {
    const authService = createAuthService()
    authService.stopRoleSimulation.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        avatarUrl: null,
      },
      memberships: [],
      actor: {
        hasSystemAdminCapability: true,
        scope: {
          membershipCompanyIds: [],
          realDataCompanyIds: [],
        },
      },
      effective: { companyId: null, role: null },
      simulation: null,
    })

    const controller = new AuthController(authService as never, createConfigService())

    await controller.stopRoleSimulation({ sub: 'user-1', email: 'admin@example.com', type: 'access' })

    expect(authService.stopRoleSimulation).toHaveBeenCalledWith('user-1')
  })
})
