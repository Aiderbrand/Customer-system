import { apiClient } from '@/lib/api/client'
import type {
  AddCommentDTO,
  Comment,
  CreateTicketDTO,
  PersistedAttachment,
  Ticket,
  TicketWithTimeline,
  TimelineEvent,
  UpdateTicketDTO,
} from '@/lib/types'
import type { Priority, TicketStatus } from '@/lib/types'

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface TicketFilters {
  companyIds?: string[]
  projectId?: string
  status?: TicketStatus[]
  priority?: Priority[]
  assignedToId?: string
  search?: string
}

// ─── Interface ────────────────────────────────────────────────────────────────

interface TicketService {
  getTickets(filters: TicketFilters): Promise<Ticket[]>
  getTicket(id: string): Promise<TicketWithTimeline | null>
  createTicket(companyId: string, dto: CreateTicketDTO, createdById: string): Promise<Ticket>
  updateTicket(id: string, dto: UpdateTicketDTO): Promise<Ticket>
  addComment(ticketId: string, dto: AddCommentDTO, userId: string): Promise<Comment>
  changeStatus(ticketId: string, newStatus: TicketStatus, changedById: string): Promise<Ticket>
  assignTicket(ticketId: string, assigneeId: string, assignedById: string): Promise<Ticket>
  attachFiles(ticketId: string, files: File[], uploadedById?: string): Promise<PersistedAttachment[]>
  removeFile(ticketId: string, fileId: string): Promise<void>
}

// ─── API response types ───────────────────────────────────────────────────────

interface ApiTicket {
  id: string
  companyId: string
  projectId: string | null
  projectName: string | null
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  createdById: string | null
  assignedToId: string | null
  assignedToName: string | null
  assignedToEmail: string | null
  slaDeadline: string | null
  createdAt: string
  updatedAt: string
}

interface ApiComment {
  id: string
  ticketId: string
  userId: string
  userName: string
  content: string
  type: 'public' | 'internal'
  createdAt: string
}

interface ApiTicketWithTimeline extends ApiTicket {
  timeline: Array<
    | { type: 'created'; data: { createdById: string | null; createdByName: string | null }; at: string }
    | { type: 'comment'; data: ApiComment; at: string }
    | { type: 'status_change'; data: { from: TicketStatus; to: TicketStatus; changedByName: string | null }; at: string }
  >
  files: Array<never>
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toTicket(raw: ApiTicket): Ticket {
  return {
    id: raw.id,
    companyId: raw.companyId,
    projectId: raw.projectId ?? undefined,
    projectName: raw.projectName,
    title: raw.title,
    description: raw.description,
    status: raw.status,
    priority: raw.priority,
    createdById: raw.createdById ?? '',
    assignedToId: raw.assignedToId ?? undefined,
    assignedToName: raw.assignedToName,
    assignedToEmail: raw.assignedToEmail,
    slaDeadline: raw.slaDeadline ? new Date(raw.slaDeadline) : new Date(),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  }
}

function toComment(raw: ApiComment): Comment {
  return {
    id: raw.id,
    ticketId: raw.ticketId,
    userId: raw.userId,
    userName: raw.userName,
    content: raw.content,
    type: raw.type,
    createdAt: new Date(raw.createdAt),
  }
}

function toTicketWithTimeline(raw: ApiTicketWithTimeline): TicketWithTimeline {
  const timeline: TimelineEvent[] = raw.timeline.map((event) => {
    if (event.type === 'created') {
      return {
        type: 'created',
        data: { createdById: event.data.createdById, createdByName: event.data.createdByName },
        at: new Date(event.at),
      }
    }

    if (event.type === 'comment') {
      return {
        type: 'comment',
        data: toComment(event.data),
        at: new Date(event.at),
      }
    }

    return {
      type: 'status_change',
      data: event.data,
      at: new Date(event.at),
    }
  })

  return {
    ...toTicket(raw),
    timeline,
    files: [],
  }
}

// ─── HTTP Implementation ───────────────────────────────────────────────────────

class HttpTicketService implements TicketService {
  async getTickets(filters: TicketFilters): Promise<Ticket[]> {
    const params = new URLSearchParams()

    if (filters.companyIds?.length) {
      params.set('companyIds', filters.companyIds.join(','))
    }

    if (filters.projectId) {
      params.set('projectId', filters.projectId)
    }

    if (filters.status?.length) {
      params.set('status', filters.status.join(','))
    }

    if (filters.priority?.length) {
      params.set('priority', filters.priority.join(','))
    }

    if (filters.assignedToId) {
      params.set('assignedToId', filters.assignedToId)
    }

    if (filters.search?.trim()) {
      params.set('q', filters.search.trim())
    }

    const query = params.toString()
    const data = await apiClient.request<ApiTicket[]>(`/tickets${query ? `?${query}` : ''}`)
    return data.map(toTicket)
  }

  async getTicket(id: string): Promise<TicketWithTimeline | null> {
    try {
      const data = await apiClient.request<ApiTicketWithTimeline>(`/tickets/${id}`)
      return toTicketWithTimeline(data)
    } catch {
      return null
    }
  }

  async createTicket(companyId: string, dto: CreateTicketDTO, _createdById: string): Promise<Ticket> {
    const data = await apiClient.request<ApiTicket>(`/companies/${companyId}/tickets`, {
      method: 'POST',
      body: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
      },
      companyId,
    })
    return toTicket(data)
  }

  async updateTicket(id: string, dto: UpdateTicketDTO): Promise<Ticket> {
    const data = await apiClient.request<ApiTicket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
      },
    })
    return toTicket(data)
  }

  async changeStatus(ticketId: string, newStatus: TicketStatus, _changedById: string): Promise<Ticket> {
    const data = await apiClient.request<ApiTicket>(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    return toTicket(data)
  }

  async assignTicket(ticketId: string, assigneeId: string, _assignedById: string): Promise<Ticket> {
    const data = await apiClient.request<ApiTicket>(`/tickets/${ticketId}/assignee`, {
      method: 'PATCH',
      body: { assigneeId },
    })
    return toTicket(data)
  }

  async addComment(ticketId: string, dto: AddCommentDTO, _userId: string): Promise<Comment> {
    const data = await apiClient.request<ApiComment>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: { content: dto.content, type: dto.type },
    })
    return toComment(data)
  }

  async attachFiles(_ticketId: string, _files: File[], _uploadedById?: string): Promise<PersistedAttachment[]> {
    throw new Error('attachFiles: file upload not implemented yet')
  }

  async removeFile(_ticketId: string, _fileId: string): Promise<void> {
    throw new Error('removeFile: not implemented yet')
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const ticketService: TicketService = new HttpTicketService()
