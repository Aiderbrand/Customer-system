import { FolderOpen, User } from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TicketStatusBadge } from './ticket-status-badge'
import { TicketPriorityBadge } from './ticket-priority-badge'
import type { Ticket } from '@/lib/types'
import type { TicketStatus } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrado', label: 'Cerrado' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketDetailHeaderProps {
  ticket: Ticket
  projectName?: string
  assigneeName?: string
  canChangeStatus: boolean
  canAssign: boolean
  onStatusChange: (status: TicketStatus) => void
  onAssign: (userId: string) => void
  members: { id: string; name: string }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketDetailHeader — header section for ticket detail.
 * Shows title, status/priority badges, project/assignee meta, and RBAC-gated action selects.
 * SLA and dates are intentionally NOT shown here — they live once in the right sidebar.
 * Pure presentational — actions via callbacks.
 */
export function TicketDetailHeader({
  ticket,
  projectName,
  assigneeName,
  canChangeStatus,
  canAssign,
  onStatusChange,
  onAssign,
  members,
}: TicketDetailHeaderProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4 border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle className="text-xl leading-tight">{ticket.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <FolderOpen className="size-3.5" aria-hidden="true" />
                {projectName ?? 'Sin proyecto'}
              </Badge>
              <Badge variant="outline" className="gap-1.5 font-normal">
                <User className="size-3.5" aria-hidden="true" />
                {assigneeName ?? 'Sin asignar'}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </div>
      </CardHeader>

      {(canChangeStatus || canAssign) ? (
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          {/* Status change */}
          {canChangeStatus && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Estado:</span>
              <Select
                value={ticket.status}
                onValueChange={(value) => onStatusChange(value as TicketStatus)}
              >
                <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignee change */}
          {canAssign && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Asignar a:</span>
              <Select
                value={ticket.assignedToId ?? 'unassigned'}
                onValueChange={(value) => onAssign(value === 'unassigned' ? '' : value)}
              >
                <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  )
}
