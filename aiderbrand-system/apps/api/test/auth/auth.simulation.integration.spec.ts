import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import type { Role } from '@prisma/client'
import { AuditService } from '../../src/audit/audit.service'
import { AuthController } from '../../src/auth/auth.controller'
import { AuthService } from '../../src/auth/auth.service'
import { UsersController } from '../../src/auth/users.controller'
import { CompaniesController } from '../../src/companies/companies.controller'
import { CompaniesRepository } from '../../src/companies/companies.repository'
import { CompaniesService } from '../../src/companies/companies.service'
import { PasswordResetRepository } from '../../src/auth/password-reset.repository'
import { RefreshTokenRepository } from '../../src/auth/refresh-token.repository'
import { RoleSimulationRepository } from '../../src/auth/role-simulation.repository'
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard'
import { InvitationsRepository } from '../../src/invitations/invitations.repository'
import { InvitationsService } from '../../src/invitations/invitations.service'
import { MembershipsService } from '../../src/memberships/memberships.service'
import { MailService } from '../../src/mail/mail.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { UsersService } from '../../src/users/users.service'

type TestUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  isActive: boolean
}

type TestCompany = {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
  deletedAt: Date | null
}

type TestMembership = {
  userId: string
  companyId: string
  role: Role
  isActive: boolean
}

type TestSimulation = {
  id: string
  actorUserId: string
  effectiveRole: Role
  startedAt: Date
  endedAt: Date | null
  stoppedAt: Date | null
  stoppedByUserId: string | null
}

type TestAuditLog = {
  actorId: string | null
  companyId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata?: Record<string, unknown>
}

type TestState = {
  users: TestUser[]
  companies: TestCompany[]
  memberships: TestMembership[]
  simulations: TestSimulation[]
  auditLogs: TestAuditLog[]
}

class TestJwtAuthGuard implements CanActivate {
  constructor(private readonly users: TestUser[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>()
    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required')
    }

    const userId = authorization.slice('Bearer '.length)
    const user = this.users.find((candidate) => candidate.id === userId && candidate.isActive)

    if (!user) {
      throw new UnauthorizedException('User not found or inactive')
    }

    request.user = { sub: user.id, email: user.email, type: 'access' }
    return true
  }
}

function createState(): TestState {
  return {
    users: [
      { id: 'admin-user', email: 'admin@example.com', name: 'Admin User', avatarUrl: null, isActive: true },
      { id: 'collaborator-user', email: 'collaborator@example.com', name: 'Collaborator User', avatarUrl: null, isActive: true },
      { id: 'target-user', email: 'target@example.com', name: 'Target User', avatarUrl: null, isActive: true },
    ],
    companies: [
      { id: 'company-admin', name: 'Admin HQ', slug: 'admin-hq', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z'), deletedAt: null },
      { id: 'company-target', name: 'Target Co', slug: 'target-co', isActive: true, createdAt: new Date('2026-01-02T00:00:00.000Z'), deletedAt: null },
    ],
    memberships: [
      { userId: 'admin-user', companyId: 'company-admin', role: 'SYSTEM_ADMIN', isActive: true },
      { userId: 'admin-user', companyId: 'company-target', role: 'PROJECT_LEAD', isActive: true },
      { userId: 'collaborator-user', companyId: 'company-admin', role: 'COLLABORATOR', isActive: true },
    ],
    simulations: [],
    auditLogs: [],
  }
}

function createPrisma(state: TestState) {
  let simulationSequence = 1

  const matchCompany = (companyId: string | undefined) =>
    state.companies.find((company) => company.id === companyId) ?? null

  return {
    companyMembership: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => (
        state.memberships.find((membership) => {
          const company = matchCompany(membership.companyId)
          if (!company) return false
          if (where.userId && membership.userId !== where.userId) return false
          if (where.companyId && membership.companyId !== where.companyId) return false
          if (where.role && membership.role !== where.role) return false
          if (where.isActive !== undefined && membership.isActive !== where.isActive) return false

          const companyWhere = where.company as Record<string, unknown> | undefined
          if (companyWhere?.isActive !== undefined && company.isActive !== companyWhere.isActive) return false
          if (companyWhere?.deletedAt === null && company.deletedAt !== null) return false

          return true
        }) ?? null
      )),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => (
        state.memberships
          .filter((membership) => {
            const company = matchCompany(membership.companyId)
            if (!company) return false
            if (where.userId && membership.userId !== where.userId) return false
            if (where.isActive !== undefined && membership.isActive !== where.isActive) return false

            const companyWhere = where.company as Record<string, unknown> | undefined
            if (companyWhere?.isActive !== undefined && company.isActive !== companyWhere.isActive) return false
            if (companyWhere?.deletedAt === null && company.deletedAt !== null) return false

            return true
          })
          .map((membership) => ({ companyId: membership.companyId, role: membership.role }))
      )),
    },
    company: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => (
        state.companies.find((company) => {
          if (where.id && company.id !== where.id) return false
          if (where.isActive !== undefined && company.isActive !== where.isActive) return false
          if (where.deletedAt === null && company.deletedAt !== null) return false
          return true
        }) ?? null
      )),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => (
        state.companies.filter((company) => {
          if (where.isActive !== undefined && company.isActive !== where.isActive) return false
          if (where.deletedAt === null && company.deletedAt !== null) return false
          return true
        }).map((company) => ({ id: company.id }))
      )),
    },
    roleSimulationSession: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => (
        state.simulations
          .filter((simulation) => {
            if (where.actorUserId && simulation.actorUserId !== where.actorUserId) return false
            if (where.endedAt === null && simulation.endedAt !== null) return false
            return true
          })
          .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
      )),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const nextSimulation: TestSimulation = {
          id: `sim-${simulationSequence++}`,
          actorUserId: String(data.actorUserId),
          effectiveRole: data.effectiveRole as Role,
          startedAt: new Date(),
          endedAt: null,
          stoppedAt: null,
          stoppedByUserId: null,
        }

        state.simulations.push(nextSimulation)
        return nextSimulation
      }),
      update: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const simulation = state.simulations.find((candidate) => candidate.id === where.id)
        if (!simulation) {
          throw new Error(`Simulation ${String(where.id)} not found`)
        }

        simulation.endedAt = (data.endedAt as Date) ?? simulation.endedAt
        simulation.stoppedAt = (data.stoppedAt as Date) ?? simulation.stoppedAt
        simulation.stoppedByUserId = (data.stoppedByUserId as string) ?? simulation.stoppedByUserId

        return simulation
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }: { data: TestAuditLog }) => {
        state.auditLogs.push(data)
        return data
      }),
    },
  }
}

async function createApp() {
  const state = createState()
  const prisma = createPrisma(state)
  const usersService = {
    findByIdOrThrow: jest.fn(async (userId: string) => {
      const user = state.users.find((candidate) => candidate.id === userId && candidate.isActive)
      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      return user
    }),
    findByEmail: jest.fn(),
  }
  const membershipsService = {
    getMembershipsForUser: jest.fn(async (userId: string) =>
      state.memberships
        .filter((membership) => membership.userId === userId)
        .map((membership) => ({
          ...membership,
          company: state.companies.find((company) => company.id === membership.companyId) ?? null,
        })),
    ),
  }

  const moduleBuilder = Test.createTestingModule({
    controllers: [AuthController, UsersController, CompaniesController],
    providers: [
      AuthService,
      CompaniesService,
      RoleSimulationRepository,
      AuditService,
      {
        provide: CompaniesRepository,
        useValue: {
          list: jest.fn(async () => ({
            items: state.companies
              .filter((company) => company.deletedAt === null && company.isActive)
              .map((company) => ({
                ...company,
                activeMemberCount: 0,
                pendingInvitationCount: 0,
              })),
            totalItems: state.companies.filter((company) => company.deletedAt === null && company.isActive).length,
            summary: {
              totalCompanies: state.companies.filter((company) => company.deletedAt === null).length,
              activeCompanies: state.companies.filter((company) => company.deletedAt === null && company.isActive).length,
              inactiveCompanies: state.companies.filter((company) => company.deletedAt === null && !company.isActive).length,
              companiesWithPendingInvitations: 0,
            },
          })),
        },
      },
      { provide: PrismaService, useValue: prisma },
      { provide: UsersService, useValue: usersService },
      { provide: MembershipsService, useValue: membershipsService },
      { provide: RefreshTokenRepository, useValue: { hash: jest.fn(), create: jest.fn(), revoke: jest.fn(), findValid: jest.fn() } },
      {
        provide: PasswordResetRepository,
        useValue: {
          hash: jest.fn(),
          findValid: jest.fn(),
          invalidatePriorAndCreate: jest.fn(async () => ({
            rawToken: 'generated-reset-token',
            record: { id: 'reset-record-1' },
          })),
        },
      },
      { provide: InvitationsService, useValue: { validateToken: jest.fn() } },
      { provide: InvitationsRepository, useValue: { hash: jest.fn() } },
      {
        provide: MailService,
        useValue: {
          isEnabled: jest.fn().mockReturnValue(false),
          sendInvitationEmail: jest.fn(async () => ({ attempted: false, sent: false, reason: 'disabled' })),
          sendPasswordResetEmail: jest.fn(async () => ({ attempted: false, sent: false, reason: 'disabled' })),
        },
      },
      { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-access-token') } },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) => {
            if (key === 'app.nodeEnv') return 'test'
            if (key === 'app.jwt.accessExpiresIn') return '15m'
            if (key === 'app.jwt.refreshExpiresIn') return '7d'
            if (key === 'app.passwordReset.expiresInHours') return 1
            if (key === 'app.frontendUrl') return 'https://app.aiderbrand.test'
            return undefined
          }),
        },
      },
    ],
  })

  const moduleRef = await moduleBuilder
    .overrideGuard(JwtAuthGuard)
    .useValue(new TestJwtAuthGuard(state.users))
    .compile()

  const app = moduleRef.createNestApplication()
  await app.init()
  await app.listen(0)

  return {
    app,
    state,
    baseUrl: await app.getUrl(),
  }
}

async function requestJson(baseUrl: string, path: string, options: { method?: string; token: string; body?: Record<string, unknown> }) {
  const response = await fetch(`${baseUrl}/auth${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = response.status === 204 ? null : await response.json()

  return {
    status: response.status,
    payload,
  }
}

async function requestApiJson(baseUrl: string, path: string, options: { method?: string; token: string }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
    },
  })

  const payload = response.status === 204 ? null : await response.json()

  return {
    status: response.status,
    payload,
  }
}

async function requestScopedApiJson(baseUrl: string, path: string, options: { method?: string; token: string; companyId: string }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'X-Company-Id': options.companyId,
    },
  })

  const payload = response.status === 204 ? null : await response.json()

  return {
    status: response.status,
    payload,
  }
}

describe('Auth simulation runtime integration', () => {
  let app: INestApplication
  let baseUrl: string
  let state: TestState

  beforeEach(async () => {
    const context = await createApp()
    app = context.app
    baseUrl = context.baseUrl
    state = context.state
  })

  afterEach(async () => {
    await app?.close()
  })

  it('returns membership-backed effective role from GET /auth/session when no simulation is active', async () => {
    const response = await requestJson(baseUrl, '/session', { token: 'admin-user' })

    expect(response.status).toBe(200)
    expect(response.payload).toEqual(
      expect.objectContaining({
        actor: expect.objectContaining({
          hasSystemAdminCapability: true,
          scope: expect.objectContaining({
            membershipCompanyIds: ['company-admin', 'company-target'],
            realDataCompanyIds: ['company-admin', 'company-target'],
          }),
        }),
        effective: { companyId: null, role: 'SYSTEM_ADMIN' },
        simulation: null,
      }),
    )
  })

  it('starts and stops role-only simulation via runtime endpoints and persists audit metadata', async () => {
    const started = await requestJson(baseUrl, '/simulation', {
      method: 'POST',
      token: 'admin-user',
      body: { effectiveRole: 'PROJECT_LEAD' },
    })

    expect(started.status).toBe(200)
    expect(started.payload).toEqual(
      expect.objectContaining({
        effective: { companyId: null, role: 'PROJECT_LEAD' },
        simulation: expect.objectContaining({
          effectiveRole: 'PROJECT_LEAD',
        }),
      }),
    )
    expect(state.simulations).toHaveLength(1)
    expect(state.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'auth.simulation.started',
          metadata: expect.objectContaining({
            authContext: expect.objectContaining({
              actorUserId: 'admin-user',
              actorHasSystemAdminCapability: true,
              actorScope: {
                membershipCompanyIds: ['company-admin', 'company-target'],
                realDataCompanyIds: ['company-admin', 'company-target'],
              },
              scopedCompanyId: null,
              effectiveRole: 'PROJECT_LEAD',
              simulation: expect.objectContaining({ sessionId: 'sim-1' }),
            }),
          }),
        }),
      ]),
    )

    const stopped = await requestJson(baseUrl, '/simulation', {
      method: 'POST',
      token: 'admin-user',
      body: { effectiveRole: 'SYSTEM_ADMIN' },
    })

    expect(stopped.status).toBe(200)
    expect(stopped.payload).toEqual(
      expect.objectContaining({
        effective: { companyId: null, role: 'SYSTEM_ADMIN' },
        simulation: null,
      }),
    )
    expect(state.simulations[0]).toEqual(
      expect.objectContaining({
        endedAt: expect.any(Date),
        stoppedAt: expect.any(Date),
        stoppedByUserId: 'admin-user',
      }),
    )
  })

  it('audits denied simulation start while preserving the real actor authority snapshot', async () => {
    const response = await requestJson(baseUrl, '/simulation', {
      method: 'POST',
      token: 'collaborator-user',
      body: { effectiveRole: 'ACCOUNT_OWNER' },
    })

    expect(response.status).toBe(403)
    expect(state.simulations).toHaveLength(0)
    expect(state.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'auth.simulation.denied',
          metadata: expect.objectContaining({
            reason: 'missing_system_admin_capability',
            authContext: expect.objectContaining({
              actorUserId: 'collaborator-user',
              actorHasSystemAdminCapability: false,
              actorScope: {
                membershipCompanyIds: ['company-admin'],
                realDataCompanyIds: ['company-admin'],
              },
              scopedCompanyId: null,
              effectiveRole: 'ACCOUNT_OWNER',
            }),
          }),
        }),
      ]),
    )
  })

  it('fails closed on invalid persisted simulation state in GET /auth/session and audits the denial', async () => {
    state.simulations.push(
      {
        id: 'sim-1',
        actorUserId: 'admin-user',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date('2026-03-31T10:00:00.000Z'),
        endedAt: null,
        stoppedAt: null,
        stoppedByUserId: null,
      },
      {
        id: 'sim-2',
        actorUserId: 'admin-user',
        effectiveRole: 'ACCOUNT_OWNER',
        startedAt: new Date('2026-03-31T11:00:00.000Z'),
        endedAt: null,
        stoppedAt: null,
        stoppedByUserId: null,
      },
    )

    const response = await requestJson(baseUrl, '/session', { token: 'admin-user' })

    expect(response.status).toBe(503)
    expect(response.payload).toEqual(
      expect.objectContaining({ message: 'Invalid role simulation state', statusCode: 503 }),
    )
    expect(state.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'auth.simulation.denied',
          metadata: expect.objectContaining({
            reason: 'invalid_state',
            authContext: expect.objectContaining({
              actorUserId: 'admin-user',
              actorHasSystemAdminCapability: true,
              actorScope: {
                membershipCompanyIds: ['company-admin', 'company-target'],
                realDataCompanyIds: ['company-admin', 'company-target'],
              },
              scopedCompanyId: null,
              effectiveRole: null,
            }),
          }),
        }),
      ]),
    )
  })

  it('returns real actor company options even while simulating a narrower role', async () => {
    const started = await requestJson(baseUrl, '/simulation', {
      method: 'POST',
      token: 'admin-user',
      body: { effectiveRole: 'COLLABORATOR' },
    })

    expect(started.status).toBe(200)

    const response = await requestApiJson(baseUrl, '/companies/options', {
      token: 'admin-user',
    })

    expect(response.status).toBe(200)
    expect(response.payload).toEqual([
      expect.objectContaining({ id: 'company-admin', name: 'Admin HQ', slug: 'admin-hq' }),
      expect.objectContaining({ id: 'company-target', name: 'Target Co', slug: 'target-co' }),
    ])
  })

  it('audits scoped password reset link generation with explicit company scope and actor scope metadata', async () => {
    const response = await requestScopedApiJson(baseUrl, '/users/target-user/password-reset-link', {
      method: 'POST',
      token: 'admin-user',
      companyId: 'company-admin',
    })

    expect(response.status).toBe(200)
    expect(response.payload).toEqual({
      resetUrl: 'https://app.aiderbrand.test/reset-password?token=generated-reset-token',
    })
    expect(state.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'password_reset_link.generated',
          companyId: 'company-admin',
          entityId: 'target-user',
          metadata: expect.objectContaining({
            authContext: expect.objectContaining({
              actorUserId: 'admin-user',
              actorHasSystemAdminCapability: true,
              actorScope: {
                membershipCompanyIds: ['company-admin', 'company-target'],
                realDataCompanyIds: ['company-admin', 'company-target'],
              },
              scopedCompanyId: 'company-admin',
              effectiveRole: 'SYSTEM_ADMIN',
              simulation: null,
            }),
            targetUserId: 'target-user',
          }),
        }),
      ]),
    )
  })
})
