import { z } from 'zod'
import type { TicketStatus, Priority } from '@/lib/types'
import type { TicketFilters } from '@/lib/services/ticket-service'

export type { TicketFilters }

// ─── Attachment re-exports ─────────────────────────────────────────────────────
// Convenience re-exports so feature components can import from one place.

export type {
  AttachmentBase,
  LocalAttachment,
  PersistedAttachment,
  Attachment,
} from '@/lib/types'

// ─── Filter UI State ──────────────────────────────────────────────────────────

export interface TicketFilterState {
  companyId?: string
  status: TicketStatus[]
  priority: Priority[]
  assignedToId?: string
  projectId?: string
  search: string
}

// ─── Create Ticket Form ───────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(2000, 'Máximo 2000 caracteres').optional().default(''),
  priority: z.enum(['baja', 'media', 'alta', 'urgente'], {
    required_error: 'La prioridad es requerida',
  }),
  projectId: z.string().optional(),
})

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>
