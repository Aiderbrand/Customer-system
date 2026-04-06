import type { Priority } from '@prisma/client'

export class CreateTicketDto {
  title!: string
  description?: string
  priority!: Priority
  projectId?: string
}

export class UpdateTicketDto {
  title?: string
  description?: string
  priority?: Priority
  projectId?: string | null
}

export class ChangeStatusDto {
  status!: string
}

export class AddCommentDto {
  content!: string
  type?: 'public' | 'internal'
}

export class AssignTicketDto {
  assigneeId!: string
}
