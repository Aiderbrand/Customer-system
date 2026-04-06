import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import { AuthContextGuard } from '../../src/common/guards/company-membership.guard'

describe('AuthContextGuard', () => {
  const createExecutionContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as ExecutionContext

  const createPrisma = () => ({
    companyMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([{ companyId: 'company-9' }]),
    },
    company: {
      findFirst: jest.fn(),
    },
  })

  const createAuditService = () => ({
    logSafe: jest.fn().mockResolvedValue(undefined),
    withAuthContext: jest.fn((metadata) => metadata),
    withAuditAuthContext: jest.fn((metadata) => metadata),
  })

  const createReflector = () => ({
    getAllAndOverride: jest.fn((key: string) => {
      if (key === 'optionalCompanyScope') {
        return false
      }

      if (key === 'allowInternalCrossCompany') {
        return false
      }

      return undefined
    }),
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('resolves role-only simulation with explicit local company scope', async () => {
    const prisma = createPrisma()
    prisma.companyMembership.findFirst
      .mockResolvedValueOnce({ role: 'SYSTEM_ADMIN' })
      .mockResolvedValueOnce(null)
    prisma.company.findFirst.mockResolvedValue({ id: 'company-9', isActive: true, deletedAt: null })

    const roleSimulationRepository = {
      findActiveByActorOrFailClosed: jest.fn().mockResolvedValue({
        id: 'sim-1',
        actorUserId: 'user-1',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date('2026-03-31T10:00:00.000Z'),
      }),
    }

    const request = {
      user: { sub: 'user-1', email: 'admin@example.com', type: 'access' },
      headers: { 'x-company-id': 'company-9' },
      method: 'POST',
      path: '/projects',
      originalUrl: '/api/v1/projects',
      route: { path: '/projects' },
    }

    const guard = new AuthContextGuard(
      createReflector() as never,
      prisma as never,
      roleSimulationRepository as never,
      createAuditService() as never,
    )

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true)
    expect(request).toMatchObject({
      authContext: {
        actorUserId: 'user-1',
        actorScope: {
          membershipCompanyIds: ['company-9'],
          realDataCompanyIds: ['company-9'],
        },
        scopedCompanyId: 'company-9',
        effectiveRole: 'PROJECT_LEAD',
        realMembershipRole: null,
        simulation: {
          sessionId: 'sim-1',
          effectiveRole: 'PROJECT_LEAD',
        },
      },
    })
  })

  it('fails closed when a simulated client role targets an inaccessible company scope', async () => {
    const prisma = createPrisma()
    prisma.companyMembership.findFirst
      .mockResolvedValueOnce({ role: 'SYSTEM_ADMIN' })
      .mockResolvedValueOnce(null)
    prisma.company.findFirst.mockResolvedValue({ id: 'company-2', isActive: true, deletedAt: null })

    const roleSimulationRepository = {
      findActiveByActorOrFailClosed: jest.fn().mockResolvedValue({
        id: 'sim-1',
        effectiveRole: 'ACCOUNT_OWNER',
        startedAt: new Date(),
      }),
      requireActiveByActor: jest.fn(),
    }

    const guard = new AuthContextGuard(
      createReflector() as never,
      prisma as never,
      roleSimulationRepository as never,
      createAuditService() as never,
    )

    await expect(
      guard.canActivate(
        createExecutionContext({
          user: { sub: 'user-1', email: 'admin@example.com', type: 'access' },
          headers: { 'x-company-id': 'company-2' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException)
  })
})
