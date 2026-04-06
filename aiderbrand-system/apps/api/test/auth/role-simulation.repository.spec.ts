import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { RoleSimulationRepository } from '../../src/auth/role-simulation.repository'

describe('RoleSimulationRepository', () => {
  const createPrisma = () => ({
    roleSimulationSession: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fails closed when concurrent active sessions exist', async () => {
    const prisma = createPrisma()
    prisma.roleSimulationSession.findMany.mockResolvedValue([{ id: 'sim-1' }, { id: 'sim-2' }])

    const repository = new RoleSimulationRepository(prisma as never)

    await expect(repository.findActiveByActorOrFailClosed('user-1')).rejects.toThrow(
      ServiceUnavailableException,
    )
  })

  it('rejects nested simulation start when the unique index is hit', async () => {
    const prisma = createPrisma()
    prisma.roleSimulationSession.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    )

    const repository = new RoleSimulationRepository(prisma as never)

    await expect(
      repository.start({
        actorUserId: 'user-1',
        effectiveRole: 'ACCOUNT_OWNER',
      }),
    ).rejects.toThrow(ConflictException)
  })

  it('throws when stopping without an active simulation', async () => {
    const prisma = createPrisma()
    prisma.roleSimulationSession.findMany.mockResolvedValue([])

    const repository = new RoleSimulationRepository(prisma as never)

    await expect(repository.stopActive('user-1', 'user-1')).rejects.toThrow(NotFoundException)
  })
})
