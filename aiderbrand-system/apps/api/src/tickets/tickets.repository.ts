import { Injectable } from '@nestjs/common'
import type { Priority, TicketStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    companyIds: string[]
    projectId?: string
    status?: TicketStatus[]
    priority?: Priority[]
    assignedToId?: string
    search?: string
  }) {
    return this.prisma.ticket.findMany({
      where: {
        companyId: { in: params.companyIds },
        deletedAt: null,
        ...(params.projectId !== undefined ? { projectId: params.projectId } : {}),
        ...(params.status?.length ? { status: { in: params.status } } : {}),
        ...(params.priority?.length ? { priority: { in: params.priority } } : {}),
        ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
        ...(params.search?.trim()
          ? { title: { contains: params.search.trim(), mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findById(ticketId: string, accessibleCompanyIds: string[]) {
    return this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        companyId: { in: accessibleCompanyIds },
        deletedAt: null,
      },
      include: {
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  async findProjectNames(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    if (ids.length === 0) return []
    return this.prisma.project.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true },
    })
  }

  async create(data: {
    companyId: string
    title: string
    description: string
    priority: Priority
    projectId?: string | null
    createdById: string
    slaDeadline?: Date | null
  }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          companyId: data.companyId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          projectId: data.projectId ?? null,
          createdById: data.createdById,
          slaDeadline: data.slaDeadline ?? null,
        },
      })

      await tx.auditLog.create({
        data: {
          actorId: data.createdById,
          companyId: data.companyId,
          action: 'ticket.created',
          entityType: 'Ticket',
          entityId: ticket.id,
          metadata: { title: data.title, priority: data.priority },
        },
      })

      return ticket
    })
  }

  async update(
    ticketId: string,
    data: {
      title?: string
      description?: string
      priority?: Priority
      projectId?: string | null
    },
  ) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      },
    })
  }

  async changeStatus(
    ticketId: string,
    newStatus: TicketStatus,
    changedById: string,
    companyId: string,
    previousStatus: TicketStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: newStatus },
      })

      await tx.auditLog.create({
        data: {
          actorId: changedById,
          companyId,
          action: 'ticket.status_changed',
          entityType: 'Ticket',
          entityId: ticketId,
          metadata: { from: previousStatus, to: newStatus },
        },
      })

      return ticket
    })
  }

  async assignTicket(ticketId: string, assigneeId: string) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: assigneeId },
    })
  }

  async addComment(data: {
    ticketId: string
    userId: string
    content: string
    type: 'public' | 'internal'
  }) {
    return this.prisma.ticketComment.create({
      data: {
        ticketId: data.ticketId,
        userId: data.userId,
        content: data.content,
        type: data.type,
      },
    })
  }
}
