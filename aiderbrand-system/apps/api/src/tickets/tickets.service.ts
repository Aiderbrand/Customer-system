import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Priority, TicketStatus } from '@prisma/client'
import { UsersRepository } from '../users/users.repository'
import { TicketsRepository } from './tickets.repository'
import type { CommentDto, TicketDto, TicketWithTimelineDto } from './dto/ticket-response.dto'

type UserEntry = { id: string; name: string; email: string }
type ProjectEntry = { id: string; name: string }

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async list(params: {
    companyIds: string[]
    projectId?: string
    status?: TicketStatus[]
    priority?: Priority[]
    assignedToId?: string
    search?: string
  }): Promise<TicketDto[]> {
    const tickets = await this.ticketsRepository.findMany(params)
    if (tickets.length === 0) return []

    const userIds = unique([
      ...tickets.map((t) => t.assignedToId).filter(Boolean),
      ...tickets.map((t) => t.createdById).filter(Boolean),
    ]) as string[]
    const projectIds = unique(tickets.map((t) => t.projectId).filter(Boolean)) as string[]

    const [users, projects] = await Promise.all([
      this.usersRepository.findManyByIds(userIds),
      this.ticketsRepository.findProjectNames(projectIds),
    ])
    const userMap = new Map(users.map((u) => [u.id, u]))
    const projectMap = new Map(projects.map((p) => [p.id, p]))

    return tickets.map((ticket) => this.toDto(ticket, userMap, projectMap))
  }

  async getById(ticketId: string, accessibleCompanyIds: string[]): Promise<TicketWithTimelineDto> {
    const ticket = await this.ticketsRepository.findById(ticketId, accessibleCompanyIds)

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`)
    }

    const userIds = unique([
      ticket.assignedToId,
      ticket.createdById,
      ...ticket.comments.map((c) => c.userId),
    ].filter(Boolean)) as string[]

    const projectIds = ticket.projectId ? [ticket.projectId] : []

    const [users, projects] = await Promise.all([
      this.usersRepository.findManyByIds(userIds),
      this.ticketsRepository.findProjectNames(projectIds),
    ])
    const userMap = new Map(users.map((u) => [u.id, u]))
    const projectMap = new Map(projects.map((p) => [p.id, p]))

    const timeline: TicketWithTimelineDto['timeline'] = [
      {
        type: 'created',
        data: {
          createdById: ticket.createdById,
          createdByName: ticket.createdById ? (userMap.get(ticket.createdById)?.name ?? null) : null,
        },
        at: ticket.createdAt.toISOString(),
      },
      ...ticket.comments.map((comment) => ({
        type: 'comment' as const,
        data: {
          id: comment.id,
          ticketId: comment.ticketId,
          userId: comment.userId,
          userName: userMap.get(comment.userId)?.name ?? 'Usuario desconocido',
          content: comment.content,
          type: comment.type as 'public' | 'internal',
          createdAt: comment.createdAt.toISOString(),
        },
        at: comment.createdAt.toISOString(),
      })),
    ]

    return {
      ...this.toDto(ticket, userMap, projectMap),
      timeline,
      files: [],
    }
  }

  async create(params: {
    companyId: string
    actorId: string
    title: string
    description: string
    priority: Priority
    projectId?: string | null
  }): Promise<TicketDto> {
    const trimmedTitle = params.title.trim()
    if (!trimmedTitle) {
      throw new Error('Ticket title is required')
    }

    const ticket = await this.ticketsRepository.create({
      companyId: params.companyId,
      title: trimmedTitle,
      description: params.description?.trim() ?? '',
      priority: params.priority,
      projectId: params.projectId ?? null,
      createdById: params.actorId,
    })

    const [users, projects] = await Promise.all([
      params.actorId ? this.usersRepository.findManyByIds([params.actorId]) : Promise.resolve([]),
      params.projectId ? this.ticketsRepository.findProjectNames([params.projectId]) : Promise.resolve([]),
    ])
    const userMap = new Map(users.map((u: UserEntry) => [u.id, u]))
    const projectMap = new Map(projects.map((p: ProjectEntry) => [p.id, p]))

    return this.toDto(ticket, userMap, projectMap)
  }

  async update(
    ticketId: string,
    accessibleCompanyIds: string[],
    data: {
      title?: string
      description?: string
      priority?: Priority
      projectId?: string | null
    },
  ): Promise<TicketDto> {
    const existing = await this.ticketsRepository.findById(ticketId, accessibleCompanyIds)
    if (!existing) {
      throw new NotFoundException(`Ticket ${ticketId} not found`)
    }

    const updated = await this.ticketsRepository.update(ticketId, data)
    const [users, projects] = await Promise.all([
      this.usersRepository.findManyByIds(
        [updated.assignedToId, updated.createdById].filter(Boolean) as string[],
      ),
      updated.projectId ? this.ticketsRepository.findProjectNames([updated.projectId]) : Promise.resolve([]),
    ])
    const userMap = new Map(users.map((u: UserEntry) => [u.id, u]))
    const projectMap = new Map(projects.map((p: ProjectEntry) => [p.id, p]))
    return this.toDto(updated, userMap, projectMap)
  }

  async changeStatus(
    ticketId: string,
    newStatus: TicketStatus,
    changedById: string,
    accessibleCompanyIds: string[],
  ): Promise<TicketDto> {
    const existing = await this.ticketsRepository.findById(ticketId, accessibleCompanyIds)
    if (!existing) {
      throw new NotFoundException(`Ticket ${ticketId} not found`)
    }

    const ticket = await this.ticketsRepository.changeStatus(
      ticketId,
      newStatus,
      changedById,
      existing.companyId,
      existing.status,
    )
    const [users, projects] = await Promise.all([
      this.usersRepository.findManyByIds(
        [ticket.assignedToId, ticket.createdById].filter(Boolean) as string[],
      ),
      ticket.projectId ? this.ticketsRepository.findProjectNames([ticket.projectId]) : Promise.resolve([]),
    ])
    const userMap = new Map(users.map((u: UserEntry) => [u.id, u]))
    const projectMap = new Map(projects.map((p: ProjectEntry) => [p.id, p]))
    return this.toDto(ticket, userMap, projectMap)
  }

  async assignTicket(
    ticketId: string,
    assigneeId: string,
    accessibleCompanyIds: string[],
  ): Promise<TicketDto> {
    const existing = await this.ticketsRepository.findById(ticketId, accessibleCompanyIds)
    if (!existing) {
      throw new NotFoundException(`Ticket ${ticketId} not found`)
    }

    const ticket = await this.ticketsRepository.assignTicket(ticketId, assigneeId)
    const [users, projects] = await Promise.all([
      this.usersRepository.findManyByIds(
        [ticket.assignedToId, ticket.createdById].filter(Boolean) as string[],
      ),
      ticket.projectId ? this.ticketsRepository.findProjectNames([ticket.projectId]) : Promise.resolve([]),
    ])
    const userMap = new Map(users.map((u: UserEntry) => [u.id, u]))
    const projectMap = new Map(projects.map((p: ProjectEntry) => [p.id, p]))
    return this.toDto(ticket, userMap, projectMap)
  }

  async addComment(
    ticketId: string,
    content: string,
    type: 'public' | 'internal',
    userId: string,
    accessibleCompanyIds: string[],
  ): Promise<CommentDto> {
    const existing = await this.ticketsRepository.findById(ticketId, accessibleCompanyIds)
    if (!existing) {
      throw new NotFoundException(`Ticket ${ticketId} not found`)
    }

    const comment = await this.ticketsRepository.addComment({ ticketId, userId, content, type })
    const [user] = await this.usersRepository.findManyByIds([userId])

    return {
      id: comment.id,
      ticketId: comment.ticketId,
      userId: comment.userId,
      userName: user?.name ?? 'Usuario desconocido',
      content: comment.content,
      type: comment.type as 'public' | 'internal',
      createdAt: comment.createdAt.toISOString(),
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toDto(
    ticket: {
      id: string
      companyId: string
      projectId: string | null
      title: string
      description: string
      status: TicketStatus
      priority: Priority
      createdById: string | null
      assignedToId: string | null
      slaDeadline: Date | null
      createdAt: Date
      updatedAt: Date
    },
    userMap: Map<string, UserEntry> = new Map(),
    projectMap: Map<string, ProjectEntry> = new Map(),
  ): TicketDto {
    return {
      id: ticket.id,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      projectName: ticket.projectId ? (projectMap.get(ticket.projectId)?.name ?? null) : null,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdById: ticket.createdById,
      assignedToId: ticket.assignedToId,
      assignedToName: ticket.assignedToId ? (userMap.get(ticket.assignedToId)?.name ?? null) : null,
      assignedToEmail: ticket.assignedToId ? (userMap.get(ticket.assignedToId)?.email ?? null) : null,
      slaDeadline: ticket.slaDeadline?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }
  }
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}
