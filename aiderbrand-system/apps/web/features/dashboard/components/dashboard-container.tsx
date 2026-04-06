'use client'

import { useMemo } from 'react'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { useAuth } from '@/contexts/auth-context'
import { useTickets } from '@/features/tickets/hooks/use-tickets'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { DashboardView } from './dashboard-view'
import type { DashboardStats } from './dashboard-view'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-card px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

/**
 * DashboardContainer — fetches tickets and projects, computes stats,
 * and passes everything to DashboardView.
 *
 * 'use client' — uses hooks.
 */
export function DashboardContainer() {
  const { currentUser, currentRole, actorGroup, effectiveCompanyId, hasPermission } = useAuth()
  const { tickets, loading: ticketsLoading } = useTickets()
  const { projects, loading: projectsLoading } = useProjects(effectiveCompanyId)

  if (!currentUser || !currentRole || !actorGroup) {
    return <DashboardSkeleton />
  }

  const loading = ticketsLoading || projectsLoading

  // ── Compute stats ──────────────────────────────────────────────────────────

  const stats = useMemo<DashboardStats>(() => {
    const openTickets = tickets.filter((t) => t.status !== 'cerrado')
    const criticalTickets = openTickets.filter(
      (t) => t.priority === 'urgente' || t.priority === 'alta',
    )
    const myTickets = tickets.filter((t) => t.assignedToId === currentUser.id)

    // "Mis tickets" only makes sense for internal roles that have view_all
    const showMyTickets = hasPermission('tickets:view_all')

    return {
      totalTickets: tickets.length,
      openTickets: openTickets.length,
      criticalTickets: criticalTickets.length,
      myTickets: myTickets.length,
      totalProjects: projects.length,
      showMyTickets,
    }
  }, [tickets, projects, currentUser.id, hasPermission])

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return <DashboardSkeleton />
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
      <DashboardView
        actorGroup={actorGroup}
        userName={currentUser.name.split(' ')[0] ?? currentUser.name}
        userRole={currentRole}
        stats={stats}
    />
  )
}
