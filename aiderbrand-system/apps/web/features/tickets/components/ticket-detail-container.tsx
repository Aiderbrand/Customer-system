'use client'

import { useCallback, useState } from 'react'
import { TicketX } from 'lucide-react'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { useAuth } from '@/contexts/auth-context'
import { useTicketDetail } from '@/features/tickets/hooks/use-ticket-detail'
import { useCompanyMembers } from '@/features/tickets/hooks/use-company-members'
import { EmptyState } from '@/components/shared/empty-state'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { TicketDetail } from './ticket-detail'
import type { TicketStatus, CommentType, PersistedAttachment } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketDetailContainerProps {
  ticketId: string
  projectId?: string
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function TicketDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Left */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2 w-[160px]" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Timeline */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-16" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <Skeleton className="h-28 w-full" />
      </div>

      {/* Right panel */}
      <div className="flex flex-col gap-4 lg:w-[280px] lg:shrink-0">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketDetailContainer — fetches ticket data, applies RBAC, and renders
 * the conversational ticket detail view.
 *
 * Accepts ticketId and optional projectId (for project-scoped routes).
 * User names come from backend DTOs (denormalized). Members loaded via useCompanyMembers.
 * 'use client' — uses hooks.
 */
export function TicketDetailContainer({ ticketId, projectId }: TicketDetailContainerProps) {
  const { hasPermission, currentUser } = useAuth()
  const { ticket, loading, error, changeStatus, assignTicket, addComment, attachFiles, removeFile } =
    useTicketDetail(ticketId)
  const { members } = useCompanyMembers(ticket?.companyId ?? null)

  // Dirty state tracking for unsaved changes dialog
  const [isDirty, setIsDirty] = useState(false)
  const { confirmationOpen, confirmNavigation, cancelNavigation } = useUnsavedChangesGuard({
    enabled: isDirty,
  })

  // ── RBAC ──────────────────────────────────────────────────────────────────

  const canChangeStatus = hasPermission('tickets:change_status')
  const canAssign = hasPermission('tickets:assign')
  const canPostInternal = hasPermission('tickets:view_internal')

  // ── Derived data ──────────────────────────────────────────────────────────

  const projectName = ticket?.projectName ?? undefined

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (status: TicketStatus) => {
      await changeStatus(status)
    },
    [changeStatus],
  )

  const handleAssign = useCallback(
    async (userId: string) => {
      await assignTicket(userId)
    },
    [assignTicket],
  )

  const handleComment = useCallback(
    async (content: string, type: CommentType) => {
      await addComment({ content, type })
    },
    [addComment],
  )

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty)
  }, [])

  const handleAttachFiles = useCallback(
    async (files: File[]): Promise<PersistedAttachment[]> => {
      return attachFiles(files)
    },
    [attachFiles],
  )

  const handleRemoveFile = useCallback(
    async (fileId: string): Promise<void> => {
      await removeFile(fileId)
    },
    [removeFile],
  )

  if (!currentUser) {
    return <TicketDetailSkeleton />
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return <TicketDetailSkeleton />
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar el ticket: {error}
        </AlertDescription>
      </Alert>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!ticket) {
    return (
      <EmptyState
        icon={TicketX}
        title="Ticket no encontrado"
        description="El ticket que buscás no existe o no tenés acceso."
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <TicketDetail
          ticket={ticket}
          members={members}
          projectName={projectName}
          canChangeStatus={canChangeStatus}
          canAssign={canAssign}
          canPostInternal={canPostInternal}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
          onComment={handleComment}
          onDirtyChange={handleDirtyChange}
          onAttachFiles={handleAttachFiles}
          onRemoveFile={handleRemoveFile}
          currentUserId={currentUser.id}
        />
      </div>

      {/* Unsaved changes dialog — shown when parent intercepts navigation */}
      <UnsavedChangesDialog
        open={confirmationOpen}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </>
  )
}
