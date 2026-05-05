'use client'

import {
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Paperclip,
  X,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import {
  Avatar,
  AvatarFallback,
} from '@workspace/ui/components/avatar'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'
import { cn } from '@workspace/ui/lib/utils'
import { getSlaStatus, formatSlaRemaining } from '@/lib/sla'
import { TicketDetailHeader } from './ticket-detail-header'
import { TicketTimeline } from './ticket-timeline'
import { TicketReplyBox } from './ticket-reply-box'
import { TicketSlaIndicator } from './ticket-sla-indicator'
import { AttachmentChip } from './attachment-chip'
import { FileViewerSheet } from './file-viewer-sheet'
import { ImageLightboxDialog } from './image-lightbox-dialog'
import type { TicketWithTimeline, PersistedAttachment, Attachment } from '@/lib/types'
import type { TicketStatus, CommentType } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketDetailProps {
  ticket: TicketWithTimeline
  members: { id: string; name: string }[]
  projectName?: string
  canChangeStatus: boolean
  canAssign: boolean
  canPostInternal: boolean
  onStatusChange: (status: TicketStatus) => void
  onAssign: (userId: string) => void
  onComment: (content: string, type: CommentType) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  onAttachFiles?: (files: File[]) => Promise<PersistedAttachment[]>
  onRemoveFile?: (fileId: string) => Promise<void>
  currentUserId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ─── SLA chip ─────────────────────────────────────────────────────────────────

function SlaAlert({ status, deadline }: { status: 'critical' | 'overdue'; deadline: Date }) {
  const remaining = formatSlaRemaining(deadline)
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
        status === 'overdue'
          ? 'bg-destructive/8 text-destructive dark:bg-destructive/15'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
      )}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      {status === 'overdue'
        ? `SLA vencido · ${remaining}`
        : `SLA crítico · ${remaining} restantes`}
    </div>
  )
}

// ─── Files section ─────────────────────────────────────────────────────────────

function TicketFilesSection({
  files,
  onOpenFile,
  onRemoveFile,
  canRemove = false,
}: {
  files: PersistedAttachment[]
  onOpenFile: (file: Attachment) => void
  onRemoveFile?: (fileId: string) => void
  canRemove?: boolean
}) {
  if (files.length === 0) {
    return (
      <p className="text-xs text-muted-foreground/60 py-1">
        Sin archivos. Adjuntá desde el compositor.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {files.map((file) => (
        <li key={file.id} className="relative">
          <button
            type="button"
            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            onClick={() => onOpenFile(file)}
          >
            <AttachmentChip
              attachment={file}
              maxNameLength={28}
              className="cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors pr-8"
            />
          </button>
          {canRemove && onRemoveFile && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none rounded-sm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

// ─── Sidebar content (shared between mobile/desktop) ─────────────────────────

function TicketSidebarContent({
  ticket,
  projectName,
  assigneeName,
  assigneeEmail,
  onOpenFile,
  onRemoveFile,
  canRemove,
}: {
  ticket: TicketWithTimeline
  projectName?: string
  assigneeName: string | null
  assigneeEmail: string | null
  onOpenFile: (f: Attachment) => void
  onRemoveFile?: (id: string) => void
  canRemove: boolean
}) {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      {/* Ticket ID */}
      <div className="flex items-center gap-1.5 py-3 px-1">
        <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="font-mono text-xs text-muted-foreground/70 truncate">{ticket.id}</span>
      </div>

      {/* SLA */}
      <div className="py-3 px-1 flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">SLA</span>
        <TicketSlaIndicator deadline={ticket.slaDeadline} createdAt={ticket.createdAt} className="w-full" />
        <span className="text-xs text-muted-foreground">Vence {formatDate(ticket.slaDeadline)}</span>
      </div>

      {/* Dates */}
      <div className="py-3 px-1 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="text-muted-foreground">Creado</span>
          <span className="ml-auto text-foreground tabular-nums">{formatDateTime(ticket.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="text-muted-foreground">Actualizado</span>
          <span className="ml-auto text-foreground tabular-nums">{formatDateTime(ticket.updatedAt)}</span>
        </div>
      </div>

      {/* Assignee */}
      <div className="py-3 px-1 flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Asignado a</span>
        {assigneeName ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="text-xs">{getInitials(assigneeName)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{assigneeName}</span>
              {assigneeEmail && <span className="truncate text-xs text-muted-foreground">{assigneeEmail}</span>}
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/60">Sin asignar</span>
        )}
      </div>

      {/* Project */}
      {projectName && (
        <div className="py-3 px-1 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Proyecto</span>
          <span className="text-sm text-foreground">{projectName}</span>
        </div>
      )}

      {/* Files */}
      <div className="py-3 px-1 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">Archivos</span>
          {ticket.files.length > 0 && (
            <span className="ml-1 tabular-nums text-xs text-foreground font-medium">{ticket.files.length}</span>
          )}
        </div>
        <TicketFilesSection
          files={ticket.files}
          onOpenFile={onOpenFile}
          onRemoveFile={onRemoveFile}
          canRemove={canRemove}
        />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TicketDetail({
  ticket,
  members,
  projectName,
  canChangeStatus,
  canAssign,
  canPostInternal,
  onStatusChange,
  onAssign,
  onComment,
  onDirtyChange,
  onAttachFiles,
  onRemoveFile,
  currentUserId,
}: TicketDetailProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(true)
  const [activeFile, setActiveFile] = useState<Attachment | null>(null)
  const [activeImage, setActiveImage] = useState<Attachment | null>(null)

  const handleOpenFile = useCallback((attachment: Attachment) => {
    if (attachment.mimeType.startsWith('image/')) {
      setActiveImage(attachment)
      return
    }
    setActiveFile(attachment)
  }, [])

  const handleAttachFiles = useCallback((files: File[]) => {
    void onAttachFiles?.(files)
  }, [onAttachFiles])

  const handleRemoveFile = useCallback((fileId: string) => {
    void onRemoveFile?.(fileId)
  }, [onRemoveFile])

  const assigneeName = ticket.assignedToName ?? null
  const assigneeEmail = ticket.assignedToEmail ?? null
  const isOpen = ticket.status !== 'cerrado'
  const slaStatus = isOpen ? getSlaStatus(ticket.slaDeadline) : 'ok'
  const showSlaAlert = isOpen && (slaStatus === 'critical' || slaStatus === 'overdue')

  const sharedHeader = (
    <div className="flex flex-col gap-3">
      <TicketDetailHeader
        ticket={ticket}
        projectName={projectName}
        assigneeName={assigneeName ?? undefined}
        canChangeStatus={canChangeStatus}
        canAssign={canAssign}
        onStatusChange={onStatusChange}
        onAssign={onAssign}
        members={members}
      />

      {showSlaAlert && (
        <SlaAlert status={slaStatus as 'critical' | 'overdue'} deadline={ticket.slaDeadline} />
      )}

      {ticket.description && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setDescriptionExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {descriptionExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Descripción
          </button>
          {descriptionExpanded && (
            <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {ticket.description}
            </p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:h-[calc(100svh-8.5rem)]">

      {/* ── Mobile ── */}
      <div className="min-h-0 flex-1 overflow-auto lg:hidden">
        <div className="flex flex-col gap-6 pb-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">{sharedHeader}</div>

          <div className="flex min-h-0 flex-col rounded-2xl border bg-card shadow-sm overflow-hidden">
            <TicketTimeline
              events={ticket.timeline}
              currentUserId={currentUserId}
              className="min-h-[12rem] max-h-[40vh]"
              onOpenFile={handleOpenFile}
            />
            <div className="border-t px-5 pb-5 pt-4">
              <TicketReplyBox
                onSubmit={onComment}
                canPostInternal={canPostInternal}
                onDirtyChange={onDirtyChange}
                onAttachFiles={onAttachFiles ? handleAttachFiles : undefined}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <TicketSidebarContent
              ticket={ticket}
              projectName={projectName}
              assigneeName={assigneeName}
              assigneeEmail={assigneeEmail}
              onOpenFile={handleOpenFile}
              onRemoveFile={onRemoveFile ? handleRemoveFile : undefined}
              canRemove={Boolean(onRemoveFile)}
            />
          </div>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden min-h-0 flex-1 overflow-hidden lg:block">
        <ResizablePanelGroup orientation="horizontal" className="gap-0 rounded-2xl border bg-card shadow-sm">

          {/* Left: conversation */}
          <ResizablePanel defaultSize="70%" minSize="55%">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {/* Header */}
              <div className="shrink-0 border-b px-6 py-5">
                {sharedHeader}
              </div>

              {/* Timeline */}
              <TicketTimeline
                events={ticket.timeline}
                currentUserId={currentUserId}
                className="min-h-0 flex-1 overflow-hidden"
                onOpenFile={handleOpenFile}
              />

              {/* Reply */}
              <div className="shrink-0 border-t px-6 pb-5 pt-4">
                <TicketReplyBox
                  onSubmit={onComment}
                  canPostInternal={canPostInternal}
                  onDirtyChange={onDirtyChange}
                  onAttachFiles={onAttachFiles ? handleAttachFiles : undefined}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: context sidebar */}
          <ResizablePanel defaultSize="30%" minSize="22%" maxSize="40%">
            <div className="h-full overflow-auto px-4 py-4">
              <TicketSidebarContent
                ticket={ticket}
                projectName={projectName}
                assigneeName={assigneeName}
                assigneeEmail={assigneeEmail}
                onOpenFile={handleOpenFile}
                onRemoveFile={onRemoveFile ? handleRemoveFile : undefined}
                canRemove={Boolean(onRemoveFile)}
              />
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>

      <FileViewerSheet attachment={activeFile} onClose={() => setActiveFile(null)} />
      <ImageLightboxDialog attachment={activeImage} onClose={() => setActiveImage(null)} />
    </div>
  )
}
