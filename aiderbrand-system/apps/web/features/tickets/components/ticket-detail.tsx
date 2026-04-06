'use client'

import {
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  CalendarCheck,
  AlertTriangle,
  Paperclip,
  X,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { Separator } from '@workspace/ui/components/separator'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Avatar,
  AvatarFallback,
} from '@workspace/ui/components/avatar'
import { Alert, AlertTitle, AlertDescription } from '@workspace/ui/components/alert'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'
import { cn } from '@workspace/ui/lib/utils'
import { getSlaStatus } from '@/lib/sla'
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
  /**
   * Called when the user selects files to attach from the reply box.
   * The container handles persistence and optimistic state update.
   */
  onAttachFiles?: (files: File[]) => Promise<PersistedAttachment[]>
  /**
   * Called when the user removes a persisted attachment from the sidebar.
   */
  onRemoveFile?: (fileId: string) => Promise<void>
  currentUserId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Archivos section ─────────────────────────────────────────────────────────

interface TicketFilesSectionProps {
  files: PersistedAttachment[]
  onOpenFile: (file: Attachment) => void
  onRemoveFile?: (fileId: string) => void
  canRemove?: boolean
}

function TicketFilesSection({
  files,
  onOpenFile,
  onRemoveFile,
  canRemove = false,
}: TicketFilesSectionProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-3 text-center">
        <Paperclip className="size-4 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-xs text-muted-foreground/70 leading-snug">
          Sin archivos adjuntos.
          <br />
          Usá el botón <span className="font-medium">📎</span> del compositor para adjuntar.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5" aria-label="Archivos adjuntos">
      {files.map((file) => {
        const handleRemove = canRemove && onRemoveFile
          ? () => onRemoveFile(file.id)
          : undefined

        return (
          <li key={file.id} className="relative">
            {/* Clickable area to open file viewer */}
            <button
              type="button"
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              onClick={() => onOpenFile(file)}
              aria-label={`Abrir ${file.name}`}
            >
              <AttachmentChip
                attachment={file}
                maxNameLength={30}
                className="cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors pr-8"
              />
            </button>
            {/* Remove button — absolutely positioned so it doesn't bubble into open handler */}
            {handleRemove && (
              <button
                type="button"
                aria-label={`Quitar ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface TicketConversationCardProps {
  ticket: TicketWithTimeline
  currentUserId: string
  canPostInternal: boolean
  onComment: (content: string, type: CommentType) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  onAttachFiles?: (files: File[]) => void
  onOpenFile: (attachment: Attachment) => void
  descriptionExpanded?: boolean
  onDescriptionExpandedChange?: (value: boolean) => void
}

function TicketConversationCard({
  ticket,
  currentUserId,
  canPostInternal,
  onComment,
  onDirtyChange,
  onAttachFiles,
  onOpenFile,
  descriptionExpanded = true,
  onDescriptionExpandedChange,
}: TicketConversationCardProps) {
  const canToggleDescription = ticket.description && typeof onDescriptionExpandedChange === 'function'

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden shadow-sm">
      <CardHeader className="gap-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Conversación y actividad</CardTitle>
            <CardDescription>Chat operativo, eventos del sistema y respuestas del equipo.</CardDescription>
          </div>
          <Badge variant="secondary">{ticket.timeline.length}</Badge>
        </div>

        {ticket.description ? (
          <div className="flex flex-col gap-2">
            {canToggleDescription ? (
              <button
                type="button"
                onClick={() => onDescriptionExpandedChange(!descriptionExpanded)}
                className="flex items-center justify-between text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
                aria-expanded={descriptionExpanded}
              >
                <span>Descripción</span>
                {descriptionExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span className="text-sm font-medium text-foreground">Descripción</span>
            )}

            {descriptionExpanded ? (
              <div className="rounded-xl border bg-muted/30 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.description}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-5 pb-0 pt-5">
        <TicketTimeline
          events={ticket.timeline}
          currentUserId={currentUserId}
          className="min-h-0 flex-1 overflow-hidden"
          onOpenFile={onOpenFile}
        />
      </CardContent>

      <div className="border-t px-5 pb-5 pt-4">
        <TicketReplyBox
          onSubmit={onComment}
          canPostInternal={canPostInternal}
          onDirtyChange={onDirtyChange}
          onAttachFiles={onAttachFiles}
        />
      </div>
    </Card>
  )
}

interface TicketContextPanelProps {
  ticket: TicketWithTimeline
  projectName?: string
  assigneeName: string | null
  assigneeEmail: string | null
  handleOpenFile: (file: Attachment) => void
  handleRemoveFile: (fileId: string) => void
  onRemoveFile?: (fileId: string) => Promise<void>
  className?: string
}

function TicketContextPanel({
  ticket,
  projectName,
  assigneeName,
  assigneeEmail,
  handleOpenFile,
  handleRemoveFile,
  onRemoveFile,
  className,
}: TicketContextPanelProps) {
  return (
    <Card className={cn('flex min-h-0 flex-col shadow-sm', className)}>
      <CardHeader className="gap-1 border-b">
        <CardTitle>Contexto</CardTitle>
        <CardDescription>Metadatos, SLA y archivos del ticket en una sola superficie.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID del ticket</span>
          <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
            <Hash className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{ticket.id}</span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">Creado</span>
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{formatDateTime(ticket.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">Última actualización</span>
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <CalendarCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{formatDateTime(ticket.updatedAt)}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SLA</span>
          <TicketSlaIndicator
            deadline={ticket.slaDeadline}
            createdAt={ticket.createdAt}
            showLabel={false}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">Vence: {formatDate(ticket.slaDeadline)}</span>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asignado a</span>
          {assigneeName ? (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{getInitials(assigneeName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{assigneeName}</span>
                {assigneeEmail ? (
                  <span className="truncate text-xs text-muted-foreground">{assigneeEmail}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sin asignar</span>
          )}
        </div>

        {ticket.projectId && projectName ? (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proyecto</span>
              <span className="text-sm text-foreground">{projectName}</span>
            </div>
          </>
        ) : null}

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Archivos</span>
            </div>
            <Badge variant="secondary">{ticket.files.length}</Badge>
          </div>
          <TicketFilesSection
            files={ticket.files}
            onOpenFile={handleOpenFile}
            onRemoveFile={onRemoveFile ? handleRemoveFile : undefined}
            canRemove={Boolean(onRemoveFile)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  const assigneeName = ticket.assignedToName ?? null
  const assigneeEmail = ticket.assignedToEmail ?? null
  const isOpen = ticket.status !== 'cerrado'
  const slaStatus = isOpen ? getSlaStatus(ticket.slaDeadline) : 'ok'
  const showSlaAlert = isOpen && (slaStatus === 'critical' || slaStatus === 'overdue')

  const handleAttachFiles = useCallback((files: File[]) => {
    void onAttachFiles?.(files)
  }, [onAttachFiles])

  const handleRemoveFile = useCallback((fileId: string) => {
    void onRemoveFile?.(fileId)
  }, [onRemoveFile])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:h-[calc(100svh-8.5rem)]">
      {showSlaAlert ? (
        slaStatus === 'overdue' ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>SLA vencido</AlertTitle>
            <AlertDescription>Este ticket superó su tiempo de respuesta.</AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-amber-400/60 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>SLA crítico</AlertTitle>
            <AlertDescription>Quedan menos de 4 horas para el vencimiento.</AlertDescription>
          </Alert>
        )
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto lg:hidden">
        <div className="grid gap-6 pb-1">
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

          <TicketConversationCard
            ticket={ticket}
            currentUserId={currentUserId}
            canPostInternal={canPostInternal}
            onComment={onComment}
            onDirtyChange={onDirtyChange}
            onAttachFiles={onAttachFiles ? handleAttachFiles : undefined}
            onOpenFile={handleOpenFile}
          />

          <TicketContextPanel
            ticket={ticket}
            projectName={projectName}
            assigneeName={assigneeName}
            assigneeEmail={assigneeEmail}
            handleOpenFile={handleOpenFile}
            handleRemoveFile={handleRemoveFile}
            onRemoveFile={onRemoveFile}
          />
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 overflow-hidden lg:block">
        <ResizablePanelGroup orientation="horizontal" className="gap-0 rounded-2xl border bg-card shadow-sm">
          <ResizablePanel defaultSize="72%" minSize="55%">
            <div className="grid min-h-0 h-full grid-rows-[auto_1fr] gap-6 overflow-hidden p-6">
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

              <TicketConversationCard
                ticket={ticket}
                currentUserId={currentUserId}
                canPostInternal={canPostInternal}
                onComment={onComment}
                onDirtyChange={onDirtyChange}
                onAttachFiles={onAttachFiles ? handleAttachFiles : undefined}
                onOpenFile={handleOpenFile}
                descriptionExpanded={descriptionExpanded}
                onDescriptionExpandedChange={setDescriptionExpanded}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="28%" minSize="22%" maxSize="40%">
            <TicketContextPanel
              ticket={ticket}
              projectName={projectName}
              assigneeName={assigneeName}
              assigneeEmail={assigneeEmail}
              handleOpenFile={handleOpenFile}
              handleRemoveFile={handleRemoveFile}
              onRemoveFile={onRemoveFile}
              className="h-full rounded-none border-0 shadow-none"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <FileViewerSheet attachment={activeFile} onClose={() => setActiveFile(null)} />
      <ImageLightboxDialog attachment={activeImage} onClose={() => setActiveImage(null)} />
    </div>
  )
}
