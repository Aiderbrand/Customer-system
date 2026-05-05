import { FolderOpen, User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TicketStatusBadge } from './ticket-status-badge'
import { TicketPriorityBadge } from './ticket-priority-badge'
import { TICKET_STATUS_OPTIONS } from '@/lib/status-configs'
import type { Ticket, TicketStatus } from '@/lib/types'

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
    <div className="flex items-start justify-between gap-4">
      {/* Left: title + meta */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
        <h1 className="text-lg font-semibold leading-tight text-foreground">{ticket.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {projectName && (
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3 shrink-0" />
              {projectName}
            </span>
          )}
          {projectName && (assigneeName !== undefined) && (
            <span className="text-muted-foreground/40">·</span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 shrink-0" />
            {assigneeName ?? 'Sin asignar'}
          </span>
        </div>
      </div>

      {/* Right: action selects */}
      {(canChangeStatus || canAssign) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canChangeStatus && (
            <Select value={ticket.status} onValueChange={(v) => onStatusChange(v as TicketStatus)}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canAssign && (
            <Select
              value={ticket.assignedToId ?? 'unassigned'}
              onValueChange={(v) => onAssign(v === 'unassigned' ? '' : v)}
            >
              <SelectTrigger className="h-7 w-[150px] text-xs">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  )
}
