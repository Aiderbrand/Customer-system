import type { Priority, TicketStatus } from '@prisma/client'

export type TicketDto = {
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

export type CommentDto = {
  id: string
  ticketId: string
  userId: string
  userName: string
  content: string
  type: 'public' | 'internal'
  createdAt: string
}

export type TicketWithTimelineDto = TicketDto & {
  timeline: Array<
    | { type: 'created'; data: { createdById: string | null; createdByName: string | null }; at: string }
    | { type: 'comment'; data: CommentDto; at: string }
    | { type: 'status_change'; data: { from: TicketStatus; to: TicketStatus; changedByName: string | null }; at: string }
  >
  files: Array<never>
}
