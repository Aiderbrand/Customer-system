'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  FolderKanban,
  ListFilter,
  Ticket as TicketIcon,
  UserRound,
} from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { AppPageHeader } from '@/components/layout/app-page'
import { EmptyState } from '@/components/shared/empty-state'
import { useAuth } from '@/contexts/auth-context'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { TicketFilters } from '@/features/tickets/components/ticket-filters'
import { TicketList } from '@/features/tickets/components/ticket-list'
import { CreateTicketSheet } from '@/features/tickets/components/create-ticket-sheet'
import type { TicketFilterState } from '@/features/tickets/types'
import { useTickets } from '@/features/tickets/hooks/use-tickets'
import type { TicketStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { resolveScopedCompanySelection } from '@/lib/company-scope'
import { useRealDataScopeCompanies } from '@/hooks/use-real-data-scope-companies'

interface TicketListContainerProps {
  projectId?: string
  mode?: 'page' | 'embedded'
}

type TicketTabValue = 'all' | TicketStatus

const STATUS_TABS: Array<{ value: TicketTabValue; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrado', label: 'Cerrados' },
]

function TicketListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: number
  hint: string
  icon: typeof TicketIcon
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TicketListContainer({ projectId, mode = 'page' }: TicketListContainerProps) {
  const router = useRouter()
  const { currentUser, currentRole, actorHasSystemAdminCapability, hasPermission } = useAuth()
  const { companyOptions, loading: companyOptionsLoading } = useRealDataScopeCompanies()
  const isEmbedded = mode === 'embedded'
  const shouldShowScopeSkeleton =
    !currentUser || !currentRole || companyOptionsLoading || (!companyOptions.length && !projectId)

  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TicketTabValue>('all')
  const [filters, setFilters] = useState<TicketFilterState>({
    companyId: undefined,
    status: [],
    priority: [],
    projectId: undefined,
    search: '',
  })
  const companySelection = useMemo(
    () => resolveScopedCompanySelection(companyOptions, projectId ? null : filters.companyId),
    [companyOptions, filters.companyId, projectId],
  )
  const scopedCompanyIds = useMemo(() => {
    if (!companyOptions.length) {
      return []
    }

    if (projectId) {
      return companyOptions.map((company) => company.id)
    }

    if (filters.companyId && !companySelection.isAccessible) {
      return []
    }

    return companySelection.selectedCompanyId
      ? [companySelection.selectedCompanyId]
      : companyOptions.map((company) => company.id)
  }, [companyOptions, companySelection.isAccessible, companySelection.selectedCompanyId, filters.companyId, projectId])
  const { projects } = useProjects(projectId ? null : companySelection.selectedCompanyId)

  const canViewAll = hasPermission('tickets:view_all')
  const assignedToId =
    !currentUser || actorHasSystemAdminCapability || canViewAll ? undefined : currentUser.id

  const { tickets, loading, error, refetch } = useTickets({
    companyIds: shouldShowScopeSkeleton ? [] : scopedCompanyIds,
    projectId,
    assignedToId,
  })

  const scopedTickets = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const matchesSearch = normalizedSearch
        ? ticket.title.toLowerCase().includes(normalizedSearch) ||
          ticket.description.toLowerCase().includes(normalizedSearch)
        : true

      const matchesPriority =
        filters.priority.length > 0 ? filters.priority.includes(ticket.priority) : true

      const matchesProject =
        !projectId && filters.projectId ? ticket.projectId === filters.projectId : true

      return matchesSearch && matchesPriority && matchesProject
    })
  }, [filters.priority, filters.projectId, filters.search, projectId, tickets])

  const statusCounts = useMemo(
    () => ({
      all: scopedTickets.length,
      pendiente: scopedTickets.filter((ticket) => ticket.status === 'pendiente').length,
      en_revision: scopedTickets.filter((ticket) => ticket.status === 'en_revision').length,
      en_proceso: scopedTickets.filter((ticket) => ticket.status === 'en_proceso').length,
      cerrado: scopedTickets.filter((ticket) => ticket.status === 'cerrado').length,
    }),
    [scopedTickets],
  )

  const visibleTickets = useMemo(() => {
    if (activeTab === 'all') {
      return scopedTickets
    }

    return scopedTickets.filter((ticket) => ticket.status === activeTab)
  }, [activeTab, scopedTickets])

  const title = projectId ? 'Tickets del proyecto' : 'Todos los tickets'
  const hasActiveFilters =
    Boolean(filters.companyId) || Boolean(filters.search.trim()) || Boolean(filters.priority.length) || Boolean(filters.projectId)
  const canFilterByCompany = !projectId && companyOptions.length > 1
  const createTicketCompanyId = projectId
    ? scopedCompanyIds[0] ?? null
    : companySelection.selectedCompanyId ?? (companyOptions.length === 1 ? companyOptions[0]?.id ?? null : null)
  const canCreateTicket = hasPermission('tickets:create') && !!createTicketCompanyId

  const overview = useMemo(
    () => ({
      total: scopedTickets.length,
      open: scopedTickets.filter((ticket) => ticket.status !== 'cerrado').length,
      critical: scopedTickets.filter(
        (ticket) => ticket.status !== 'cerrado' && ['urgente', 'alta'].includes(ticket.priority),
      ).length,
      unassigned: scopedTickets.filter((ticket) => !ticket.assignedToId).length,
    }),
    [scopedTickets],
  )

  function handleTicketClick(ticketId: string) {
    if (projectId) {
      router.push(`/projects/${projectId}/tickets/${ticketId}`)
      return
    }

    router.push(`/tickets/${ticketId}`)
  }

  if (!currentUser || !currentRole || companyOptionsLoading || (!companyOptions.length && !projectId)) {
    return <TicketListSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      {isEmbedded ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            {!loading ? <Badge variant="secondary">{visibleTickets.length}</Badge> : null}
          </div>

          {hasPermission('tickets:create') ? (
            <Button onClick={() => setCreateSheetOpen(true)} disabled={!canCreateTicket}>Nuevo ticket</Button>
          ) : null}
        </div>
      ) : (
        <AppPageHeader
          title={title}
          badge={!loading ? <Badge variant="secondary">{visibleTickets.length}</Badge> : undefined}
          description="Vista tabla-first con filtros consistentes, badges semánticos y acceso directo al detalle."
          actions={hasPermission('tickets:create') ? <Button onClick={() => setCreateSheetOpen(true)} disabled={!canCreateTicket}>Nuevo ticket</Button> : undefined}
        />
      )}

      {loading ? (
        <TicketListSkeleton />
      ) : (
        <>
          {!isEmbedded && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewCard label="Total" value={overview.total} hint="Tickets en el alcance actual" icon={TicketIcon} />
              <OverviewCard label="Abiertos" value={overview.open} hint="Pendientes de resolución" icon={ListFilter} />
              <OverviewCard label="Críticos" value={overview.critical} hint="Alta y urgente activos" icon={AlertTriangle} />
              <OverviewCard label="Sin asignar" value={overview.unassigned} hint="Necesitan responsable" icon={UserRound} />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TicketTabValue)} className="gap-4">
            {isEmbedded ? (
              <div className="flex flex-col gap-4">
                <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/60 p-1 lg:w-fit">
                  {STATUS_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                      {tab.label}
                      <Badge variant="secondary">{statusCounts[tab.value]}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TicketFilters
                  filters={filters}
                  onChange={setFilters}
                  showCompanyFilter={canFilterByCompany}
                  companies={companyOptions}
                  showProjectFilter={!projectId}
                  projects={projects}
                />

                {renderTicketsBody()}
              </div>
            ) : (
              <Card className="overflow-clip">
                <CardHeader className="gap-4 border-b">
                  <div className="flex flex-col gap-1">
                    <CardTitle>Listado principal</CardTitle>
                    <CardDescription>
                      Priorizado para escaneo rápido, comparación y navegación al detalle.
                    </CardDescription>
                  </div>
                  <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/60 p-1 lg:w-fit">
                    {STATUS_TABS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                        {tab.label}
                        <Badge variant="secondary">{statusCounts[tab.value]}</Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TicketFilters
                    filters={filters}
                    onChange={setFilters}
                    showCompanyFilter={canFilterByCompany}
                    companies={companyOptions}
                    showProjectFilter={!projectId}
                    projects={projects}
                  />
                </CardHeader>

                <CardContent className="p-4">{renderTicketsBody()}</CardContent>
              </Card>
            )}
          </Tabs>
        </>
      )}

      <CreateTicketSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        defaultProjectId={projectId}
        projects={projects}
        companyId={createTicketCompanyId ?? companyOptions[0]?.id ?? ''}
        createdById={currentUser.id}
        onCreated={() => refetch()}
      />
    </div>
  )

  function renderTicketsBody() {
    if (error) {
      return <EmptyState icon={TicketIcon} title="Error al cargar tickets" description={error} />
    }

    if (visibleTickets.length === 0) {
      if (activeTab !== 'all' && scopedTickets.length > 0) {
        return (
          <EmptyState
            icon={FolderKanban}
            title="Sin tickets en esta vista"
            description="No hay tickets con ese estado dentro del alcance actual."
          />
        )
      }

      if (hasActiveFilters) {
        return (
          <EmptyState
            icon={TicketIcon}
            title="Sin resultados"
            description="No encontramos tickets que coincidan con los filtros seleccionados."
          />
        )
      }

      return (
        <EmptyState
          icon={TicketIcon}
          title="Sin tickets aún"
            description="Cuando se creen tickets aparecerán acá con esta vista tabular."
            action={
              canCreateTicket ? (
                <Button onClick={() => setCreateSheetOpen(true)}>Nuevo ticket</Button>
              ) : undefined
            }
        />
      )
    }

    return (
      <TicketList
        tickets={visibleTickets}
        projects={projects}
        onTicketClick={handleTicketClick}
      />
    )
  }
}
