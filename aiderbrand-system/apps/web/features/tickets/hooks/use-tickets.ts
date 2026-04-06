'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ticketService } from '@/lib/services/ticket-service'
import type { Ticket, CreateTicketDTO } from '@/lib/types'
import type { TicketFilters } from '@/features/tickets/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionalFilters = TicketFilters

interface UseTicketsResult {
  tickets: Ticket[]
  loading: boolean
  error: string | null
  refetch: () => void
  createTicket: (dto: CreateTicketDTO) => Promise<Ticket>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useTickets — fetches tickets scoped to the current company.
 * Accepts optional filters (projectId, status, priority, assignedToId, search).
 * Also exposes a createTicket action that refetches the list on success.
 */
export function useTickets(filters: OptionalFilters = {}): UseTicketsResult {
  const { currentUser, effectiveCompanyId } = useAuth()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Counter used to trigger refetches without exposing internals
  const [fetchCount, setFetchCount] = useState(0)

  // Stable serialized filter key — avoids effect re-runs on every render
  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (filters.companyIds && filters.companyIds.length === 0) {
        setTickets([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await ticketService.getTickets(JSON.parse(filtersKey) as OptionalFilters)
        if (!cancelled) setTickets(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar tickets')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.companyIds, filtersKey, fetchCount])

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1)
  }, [])

  const createTicket = useCallback(
    async (dto: CreateTicketDTO): Promise<Ticket> => {
      const explicitCompanyId = filters.companyIds?.length === 1 ? filters.companyIds[0] : effectiveCompanyId

      if (!explicitCompanyId || !currentUser) {
        throw new Error('No hay una sesión activa para crear tickets.')
      }

      const ticket = await ticketService.createTicket(explicitCompanyId, dto, currentUser.id)
      refetch()
      return ticket
    },
    [currentUser, effectiveCompanyId, filters.companyIds, refetch],
  )

  return { tickets, loading, error, refetch, createTicket }
}
