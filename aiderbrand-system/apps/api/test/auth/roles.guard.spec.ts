import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from '../../src/common/guards/roles.guard'

describe('RolesGuard', () => {
  const createExecutionContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('authorizes with the effective role instead of the real membership role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['PROJECT_LEAD']),
    } as unknown as Reflector

    const guard = new RolesGuard(reflector)

    expect(
      guard.canActivate(
        createExecutionContext({
          authContext: {
            effectiveRole: 'PROJECT_LEAD',
          },
        }),
      ),
    ).toBe(true)
  })

  it('fails closed when the effective role is missing or forbidden', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SYSTEM_ADMIN']),
    } as unknown as Reflector

    const guard = new RolesGuard(reflector)

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          authContext: {
            effectiveRole: 'ACCOUNT_OWNER',
          },
        }),
      ),
    ).toThrow(ForbiddenException)
  })
})
