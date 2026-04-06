'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ticketService } from '@/lib/services/ticket-service'
import type { TicketWithTimeline, Comment, Ticket, AddCommentDTO, PersistedAttachment } from '@/lib/types'
import type { TicketStatus } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseTicketDetailResult {
  ticket: TicketWithTimeline | null
  loading: boolean
  error: string | null
  refetch: () => void
  addComment: (dto: AddCommentDTO) => Promise<Comment>
  changeStatus: (newStatus: TicketStatus) => Promise<Ticket>
  assignTicket: (assigneeId: string) => Promise<Ticket>
  attachFiles: (files: File[]) => Promise<PersistedAttachment[]>
  removeFile: (fileId: string) => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useTicketDetail — fetches a single ticket with its full timeline.
 * Exposes actions for adding comments, changing status, and assigning.
 * Uses currentUser for comment authoring and future RBAC enforcement.
 */
export function useTicketDetail(ticketId: string): UseTicketDetailResult {
  const { currentUser } = useAuth()

  const [ticket, setTicket] = useState<TicketWithTimeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await ticketService.getTicket(ticketId)
        if (!cancelled) setTicket(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el ticket')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [ticketId, fetchCount])

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1)
  }, [])

  const addComment = useCallback(
    async (dto: AddCommentDTO): Promise<Comment> => {
      if (!currentUser) {
        throw new Error('No hay una sesión activa para comentar.')
      }

      const comment = await ticketService.addComment(ticketId, dto, currentUser.id)
      refetch()
      return comment
    },
    [ticketId, currentUser?.id, refetch],
  )

  const changeStatus = useCallback(
    async (newStatus: TicketStatus): Promise<Ticket> => {
      if (!currentUser) {
        throw new Error('No hay una sesión activa para cambiar estado.')
      }

      const prevStatus = ticket?.status
      const now = new Date()
      const updated = await ticketService.changeStatus(ticketId, newStatus, currentUser.id)
      // Optimistic: inject status_change event immediately, then refetch to sync
      if (prevStatus && prevStatus !== newStatus) {
        setTicket((prev) => {
          if (!prev) return prev
          const statusEvent = {
            type: 'status_change' as const,
            data: { from: prevStatus, to: newStatus, changedByName: null },
            at: now,
          }
          const newTimeline = [...prev.timeline, statusEvent].sort(
            (a, b) => a.at.getTime() - b.at.getTime(),
          )
          return { ...prev, status: newStatus, timeline: newTimeline }
        })
      } else {
        refetch()
      }
      return updated
    },
    [ticketId, currentUser?.id, ticket?.status, refetch],
  )

  const assignTicket = useCallback(
    async (assigneeId: string): Promise<Ticket> => {
      if (!currentUser) {
        throw new Error('No hay una sesión activa para asignar tickets.')
      }

      const now = new Date()
      const updated = await ticketService.assignTicket(ticketId, assigneeId, currentUser.id)
      // Optimistic: inject assignment event immediately
      setTicket((prev) => {
        if (!prev) return prev
        const assignEvent = {
          type: 'assignment' as const,
          data: { assigneeName: null, assignedByName: null },
          at: now,
        }
        const newTimeline = [...prev.timeline, assignEvent].sort(
          (a, b) => a.at.getTime() - b.at.getTime(),
        )
        return { ...prev, assignedToId: assigneeId, timeline: newTimeline }
      })
      return updated
    },
    [ticketId, currentUser?.id],
  )

  const attachFiles = useCallback(
    async (files: File[]): Promise<PersistedAttachment[]> => {
      if (!currentUser) {
        throw new Error('No hay una sesión activa para adjuntar archivos.')
      }

      const now = new Date()
      const persisted = await ticketService.attachFiles(ticketId, files, currentUser.id)
      // Optimistic: update local state immediately without a full refetch
      setTicket((prev) => {
        if (!prev) return prev
        const fileEvent = {
          type: 'file_attachment' as const,
          data: {
            fileNames: files.map((f) => f.name),
            uploadedById: currentUser.id,
            uploadedByName: currentUser.name,
            // Include full attachment objects so the timeline can render inline previews
            attachments: persisted,
          },
          at: now,
        }
        const newTimeline = [...prev.timeline, fileEvent].sort(
          (a, b) => a.at.getTime() - b.at.getTime(),
        )
        return { ...prev, files: [...prev.files, ...persisted], timeline: newTimeline }
      })
      return persisted
    },
    [ticketId, currentUser?.id],
  )

  const removeFile = useCallback(
    async (fileId: string): Promise<void> => {
      await ticketService.removeFile(ticketId, fileId)
      // Optimistic: remove from local state immediately
      setTicket((prev) => {
        if (!prev) return prev
        return { ...prev, files: prev.files.filter((f) => f.id !== fileId) }
      })
    },
    [ticketId],
  )

  return { ticket, loading, error, refetch, addComment, changeStatus, assignTicket, attachFiles, removeFile }
}
