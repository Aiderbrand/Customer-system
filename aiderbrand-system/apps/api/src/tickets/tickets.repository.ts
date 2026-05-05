import { Injectable } from '@nestjs/common'
import type { Priority, Ticket, TicketStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countByProjectIds(
    projectIds: string[],
    options?: { excludeStatuses?: TicketStatus[] },
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const rows = await this.prisma.ticket.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        ...(options?.excludeStatuses?.length ? { status: { notIn: options.excludeStatuses } } : {}),
      },
      _count: { id: true },
    })
    return new Map(rows.filter((r) => r.projectId).map((r) => [r.projectId!, r._count.id]))
  }

  async findSummaryByProjectId(
    projectId: string,
  ): Promise<Array<Pick<Ticket, 'id' | 'title' | 'status' | 'priority'>>> {
    return this.prisma.ticket.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, title: true, status: true, priority: true },
      orderBy: { createdAt: 'desc' },
    })
  }

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

  async create(data: {
    companyId: string
    title: string
    description: string
    priority: Priority
    projectId?: string | null
    createdById: string
    slaDeadline?: Date | null
  }) {
    return this.prisma.ticket.create({
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

  async changeStatus(ticketId: string, newStatus: TicketStatus) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus },
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
