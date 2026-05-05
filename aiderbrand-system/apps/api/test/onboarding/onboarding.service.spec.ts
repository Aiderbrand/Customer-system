import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { OnboardingService } from '../../src/onboarding/onboarding.service'

// ─── Shared mock factory ────────────────────────────────────────────────────

function createBaseInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    type: 'ONBOARDING',
    status: 'PENDING',
    email: 'test@test.com',
    companyId: 'company-1',
    createdById: 'admin-1',
    ...overrides,
  }
}

function createTx(userAlreadyExists = false) {
  const existingUser = userAlreadyExists
    ? { id: 'user-existing', email: 'test@test.com', name: 'Existing' }
    : null

  const createdUser = { id: 'user-1', email: 'test@test.com', name: 'Test User' }

  return {
    invitation: {
      findUnique: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'PENDING' }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(existingUser),
      create: jest.fn().mockResolvedValue(createdUser),
      update: jest.fn().mockResolvedValue(createdUser),
    },
    companyMembership: {
      upsert: jest.fn().mockResolvedValue(undefined),
    },
    onboardingSubmission: {
      create: jest.fn().mockResolvedValue({ id: 'sub-1', companyId: 'company-1' }),
    },
    company: {
      findUnique: jest.fn().mockResolvedValue({ id: 'company-1', name: 'Test Co' }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    auditLog: {
      createMany: jest.fn().mockResolvedValue(undefined),
    },
  }
}

function createService(overrides: {
  invitationOverrides?: Record<string, unknown>
  onboardingEnabled?: boolean
  prismaSubmission?: Record<string, unknown> | null
  txFactory?: () => ReturnType<typeof createTx>
} = {}) {
  const {
    invitationOverrides = {},
    onboardingEnabled = true,
    prismaSubmission = null,
    txFactory = createTx,
  } = overrides

  const invitation = createBaseInvitation(invitationOverrides)

  const invitationsService = {
    validateToken: jest.fn().mockResolvedValue(invitation),
    create: jest.fn().mockResolvedValue(undefined),
  }

  const projectsRepository = {
    createOnboardingProject: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Optimización operativa - Test Co' }),
  }

  const auditService = {
    logSafe: jest.fn().mockResolvedValue(undefined),
  }

  const jwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  }

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'app.onboarding.enabled') return onboardingEnabled
      if (key === 'app.jwt.accessExpiresIn') return '15m'
      return undefined
    }),
  }

  const tx = txFactory()

  const prisma = {
    $transaction: jest.fn().mockImplementation(async (callback: (tx: typeof tx) => Promise<void>) => {
      await callback(tx)
    }),
    company: {
      update: jest.fn().mockResolvedValue({ id: 'company-1', name: 'Test Co' }),
    },
    onboardingSubmission: {
      findUnique: jest.fn().mockResolvedValue(prismaSubmission),
      findFirst: jest.fn().mockResolvedValue(prismaSubmission),
      update: jest.fn().mockResolvedValue({ ...(prismaSubmission ?? {}), industry: 'updated' }),
    },
    companyMembership: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  }

  const service = new OnboardingService(
    prisma as never,
    invitationsService as never,
    projectsRepository as never,
    auditService as never,
    jwtService as never,
    configService as never,
  )

  return {
    service,
    invitationsService,
    projectsRepository,
    jwtService,
    prisma,
    tx,
    auditService,
  }
}

function buildCompleteDto(tokenOverride = 'opaque-token') {
  return {
    token: tokenOverride,
    name: 'Test User',
    password: 'Password123!',
    formAnswers: {
      industry: 'Tecnología',
      teamSize: '10-50',
      yearsOperating: '3',
      mainPainPoints: 'Comunicación interna',
      toolsInUse: ['Slack', 'Notion'],
      decisionMakers: [{ name: 'Juan', role: 'CEO', email: 'juan@test.com' }],
      primaryContact: { name: 'María', role: 'COO', email: 'maria@test.com' },
      shortTermGoals: 'Automatizar reportes',
      midTermGoals: 'Escalar equipo',
      successMetrics: 'ROI positivo en 6 meses',
      startTimeframe: 'Inmediato',
    },
  }
}

// ─── D.1 — Happy path: complete() ───────────────────────────────────────────

describe('OnboardingService.complete() — happy path', () => {
  afterEach(() => jest.clearAllMocks())

  it('D.1: should create user, membership, submission, project, and return tokens', async () => {
    const ctx = createService()
    const dto = buildCompleteDto()

    const result = await ctx.service.complete(dto)

    // $transaction called
    expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1)

    // user.create called (no existing user)
    expect(ctx.tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'test@test.com' }),
      }),
    )

    // companyMembership.upsert called with ACCOUNT_OWNER
    expect(ctx.tx.companyMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_companyId: { userId: 'user-1', companyId: 'company-1' },
        },
        create: expect.objectContaining({ role: 'ACCOUNT_OWNER' }),
        update: expect.objectContaining({ role: 'ACCOUNT_OWNER' }),
      }),
    )

    // onboardingSubmission.create called with status submitted
    expect(ctx.tx.onboardingSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-1',
          industry: 'Tecnología',
          status: 'submitted',
        }),
      }),
    )

    // createOnboardingProject called with the tx
    expect(ctx.projectsRepository.createOnboardingProject).toHaveBeenCalledWith(
      ctx.tx,
      expect.objectContaining({ companyId: 'company-1' }),
    )

    // invitation.update called with ACCEPTED
    expect(ctx.tx.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      }),
    )

    // Response contains tokens
    expect(result.accessToken).toBe('mock-token')
    expect(result.refreshToken).toEqual(expect.any(String))
    expect(result.user.email).toBe('test@test.com')
    expect(result.company.id).toBe('company-1')
  })
})

// ─── D.2 — Cross-token rejection ────────────────────────────────────────────

describe('OnboardingService.complete() — cross-token rejection', () => {
  afterEach(() => jest.clearAllMocks())

  it('D.2a: should throw BadRequestException when token type is MEMBER', async () => {
    const ctx = createService({ invitationOverrides: { type: 'MEMBER' } })
    const dto = buildCompleteDto()

    await expect(ctx.service.complete(dto)).rejects.toThrow(BadRequestException)
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('D.2b: AuthService should throw BadRequestException when invitation type is ONBOARDING', async () => {
    // This guard lives in auth.service.ts — we test the logic directly via import
    const { AuthService } = await import('../../src/auth/auth.service')

    const invitation = { id: 'inv-x', type: 'ONBOARDING', status: 'PENDING', email: 'x@x.com', companyId: 'c-1', role: 'MEMBER' }

    const mockPrisma = {
      $transaction: jest.fn(),
      companyMembership: { findFirst: jest.fn().mockResolvedValue(null) },
    }

    const authService = new AuthService(
      { findByEmail: jest.fn(), findByIdOrThrow: jest.fn() } as never,
      { getMembershipsForUser: jest.fn() } as never,
      { logSafe: jest.fn().mockResolvedValue(undefined) } as never,
      { hash: jest.fn().mockReturnValue('h'), create: jest.fn(), revoke: jest.fn(), findValid: jest.fn() } as never,
      { hash: jest.fn(), findValid: jest.fn(), invalidatePriorAndCreate: jest.fn() } as never,
      { validateToken: jest.fn().mockResolvedValue(invitation) } as never,
      { hash: jest.fn().mockReturnValue('h') } as never,
      mockPrisma as never,
      { findActiveByActorOrFailClosed: jest.fn().mockResolvedValue(null), stopActive: jest.fn() } as never,
      { sendPasswordResetEmail: jest.fn() } as never,
      { sign: jest.fn().mockReturnValue('tok') } as never,
      { get: jest.fn().mockReturnValue('15m') } as never,
    )

    await expect(
      authService.acceptInvitation({ rawToken: 'onboarding-token', name: 'X', password: 'Password123!' }),
    ).rejects.toThrow(BadRequestException)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})

// ─── D.3 — Feature flag: disabled → NotFoundException in controller ──────────

describe('OnboardingController — feature flag off', () => {
  afterEach(() => jest.clearAllMocks())

  it('D.3: should throw NotFoundException when onboarding.enabled is false', async () => {
    const { OnboardingController } = await import('../../src/onboarding/onboarding.controller')

    const onboardingService = {
      validateToken: jest.fn(),
      complete: jest.fn(),
      getSubmissionByUser: jest.fn(),
      updateSubmissionByUser: jest.fn(),
      markReviewed: jest.fn(),
      resolveCompanyIdForUser: jest.fn(),
    }

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.onboarding.enabled') return false
        return undefined
      }),
    }

    const controller = new OnboardingController(onboardingService as never, configService as never)

    await expect(
      controller.validateToken({ token: 'any-token' }),
    ).rejects.toThrow(NotFoundException)

    expect(onboardingService.validateToken).not.toHaveBeenCalled()
  })
})

// ─── D.5 — updateSubmissionByUser() guards ───────────────────────────────────

describe('OnboardingService.updateSubmissionByUser() — guards', () => {
  afterEach(() => jest.clearAllMocks())

  const baseSubmission = {
    id: 'sub-1',
    companyId: 'company-1',
    userId: 'user-1',
    reviewedAt: null,
    industry: 'Tech',
    teamSize: '10-50',
    yearsOperating: '3',
    mainPainPoints: 'pain',
    toolsInUse: [],
    decisionMakers: [],
    primaryContact: {},
    shortTermGoals: 'goals',
    midTermGoals: 'goals',
    successMetrics: 'metrics',
    budgetRange: null,
    startTimeframe: 'Inmediato',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewedById: null,
  }

  it('D.5a: should throw ForbiddenException when reviewedAt is not null', async () => {
    const reviewedSubmission = { ...baseSubmission, reviewedAt: new Date() }
    const ctx = createService({ prismaSubmission: reviewedSubmission })

    await expect(
      ctx.service.updateSubmissionByUser('user-1', { industry: 'Retail' }),
    ).rejects.toThrow(ForbiddenException)

    expect(ctx.prisma.onboardingSubmission.update).not.toHaveBeenCalled()
  })

  it('D.5b: should throw NotFoundException when no submission found for user', async () => {
    const ctx = createService({ prismaSubmission: null })

    await expect(
      ctx.service.updateSubmissionByUser('user-1', { industry: 'Retail' }),
    ).rejects.toThrow(NotFoundException)
  })

  it('D.5c: should update and call auditService on happy path', async () => {
    const ctx = createService({ prismaSubmission: baseSubmission })
    ctx.prisma.companyMembership.findFirst.mockResolvedValue({ id: 'mem-1', userId: 'user-1', companyId: 'company-1', isActive: true })

    const result = await ctx.service.updateSubmissionByUser('user-1', { industry: 'Retail' })

    expect(ctx.prisma.onboardingSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ industry: 'Retail' }),
      }),
    )

    // Audit service emitted (fire-and-forget, but called)
    // Give the micro-task queue a tick so the fire-and-forget `.catch` chain resolves
    await Promise.resolve()
    expect(ctx.auditService.logSafe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'onboarding.submission.updated' }),
    )

    expect(result).toBeDefined()
  })
})
