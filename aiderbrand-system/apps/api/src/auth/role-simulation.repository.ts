import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { RoleSimulationSession } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

type ActiveSimulationRecord = RoleSimulationSession

@Injectable()
export class RoleSimulationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByActorOrFailClosed(actorUserId: string): Promise<ActiveSimulationRecord | null> {
    const sessions = await this.prisma.roleSimulationSession.findMany({
      where: {
        actorUserId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    })

    if (sessions.length === 0) {
      return null
    }

    if (sessions.length > 1) {
      throw new ServiceUnavailableException('Invalid role simulation state')
    }

    return sessions[0] ?? null
  }

  async start(params: {
    actorUserId: string
    effectiveRole: RoleSimulationSession['effectiveRole']
  }): Promise<ActiveSimulationRecord> {
    try {
      await this.prisma.roleSimulationSession.create({
        data: {
          actorUserId: params.actorUserId,
          effectiveRole: params.effectiveRole,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An active role simulation already exists for this actor')
      }

      throw error
    }

    return this.requireActiveByActor(params.actorUserId)
  }

  async stopActive(actorUserId: string, stoppedByUserId: string): Promise<RoleSimulationSession> {
    const active = await this.findActiveByActorOrFailClosed(actorUserId)

    if (!active) {
      throw new NotFoundException('No active role simulation exists')
    }

    const now = new Date()

    return this.prisma.roleSimulationSession.update({
      where: { id: active.id },
      data: {
        endedAt: now,
        stoppedAt: now,
        stoppedByUserId,
      },
    })
  }

  async requireActiveByActor(actorUserId: string): Promise<ActiveSimulationRecord> {
    const active = await this.findActiveByActorOrFailClosed(actorUserId)

    if (!active) {
      throw new NotFoundException('No active role simulation exists')
    }

    return active
  }
}
