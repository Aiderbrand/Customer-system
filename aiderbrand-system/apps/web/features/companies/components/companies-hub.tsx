'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { AppPageHeader } from '@/components/layout/app-page'
import { EmptyState } from '@/components/shared/empty-state'
import {
  CompanyConfirmDialog,
  CompanyFormDialog,
  InviteMemberDialog,
} from '@/features/companies/components/company-dialogs'
import { CompaniesHubSummary } from '@/features/companies/components/companies-hub-summary'
import {
  COMPANY_SORT_OPTIONS,
  COMPANY_STATUS_OPTIONS,
  useCompaniesHub,
} from '@/features/companies/hooks/use-companies-hub'
import { useAuth } from '@/contexts/auth-context'
import { getInvitableRoles } from '@/lib/rbac'
import { companyService } from '@/lib/services/company-service'
import type { CompanyHubItem } from '@/lib/types'

function CompaniesHubSkeleton() {
  return (
    <div className="flex flex-col gap-6">
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
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
  }).format(value)
}

export function CompaniesHubContainer() {
  const router = useRouter()
  const {
    hub,
    companies,
    loading,
    error,
    search,
    status,
    sort,
    page,
    setSearch,
    setStatus,
    setSort,
    setPage,
    clearFilters,
    refetch,
  } = useCompaniesHub()
  const { currentRole, hasPermission } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CompanyHubItem | null>(null)
  const [inviteTarget, setInviteTarget] = useState<CompanyHubItem | null>(null)
  const [statusTarget, setStatusTarget] = useState<CompanyHubItem | null>(null)
  const [submitting, setSubmitting] = useState<'create' | 'edit' | 'invite' | 'status' | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const canCreateCompany = hasPermission('companies:create')
  const canUpdateCompany = hasPermission('companies:update')
  const canInviteMember = hasPermission('companies:invite')
  const canUpdateStatus = hasPermission('companies:status')
  const allowedInviteRoles = currentRole ? getInvitableRoles(currentRole) : []
  const hasActiveFilters = Boolean(search.trim()) || Boolean(status) || sort !== 'updatedAt.desc'

  const emptyState = useMemo(() => {
    if ((hub?.totalItems ?? 0) === 0) {
      return (
        <EmptyState
          icon={Building2}
          title="Todavía no hay companies registradas"
          description="Creá la primera company para empezar a organizar operación, equipo e invitaciones desde este listado."
          action={canCreateCompany ? <Button onClick={() => setCreateOpen(true)}>Crear company</Button> : undefined}
        />
      )
    }

    if (companies.length === 0) {
      return (
        <EmptyState
          icon={Building2}
          title="No hay resultados para esta vista"
          description="Ajustá la búsqueda o los filtros para recuperar companies visibles en esta vista."
          action={
            <Button variant="outline" onClick={() => clearFilters()}>
              Limpiar filtros
            </Button>
          }
        />
      )
    }

    return null
  }, [canCreateCompany, clearFilters, companies.length, hub?.totalItems])

  if (loading) {
    return <CompaniesHubSkeleton />
  }

  if (error) {
    return (
        <EmptyState
          icon={Building2}
          title="Error al cargar Companies"
          description={error}
          action={<Button variant="outline" onClick={() => refetch()}>Reintentar</Button>}
        />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        title="Companies"
        badge={!loading ? <Badge variant="secondary">{hub?.totalItems ?? 0}</Badge> : undefined}
        description="Gestioná companies, estado operativo y acceso del equipo desde un único listado con contexto real."
        actions={canCreateCompany ? <Button onClick={() => setCreateOpen(true)}>Nueva company</Button> : undefined}
      />

      <CompaniesHubSummary summary={hub?.summary ?? null} />

      <Card>
          <CardHeader className="gap-4 border-b">
            <div className="flex flex-col gap-1">
              <CardTitle>Listado principal</CardTitle>
              <CardDescription>Vista operativa con los datos necesarios para abrir detalle, invitar miembros y mantener el estado de cada company.</CardDescription>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o slug" className="pl-9" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Select value={status ?? 'all'} onValueChange={(value) => setStatus(value === 'all' ? null : (value as 'active' | 'inactive'))}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Todas</SelectItem>
                      {COMPANY_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {COMPANY_SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {hasActiveFilters ? (
                  <Button variant="ghost" size="sm" onClick={() => clearFilters()}>
                    Limpiar
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 p-4">
            {emptyState ?? (
              <>
                <div className="overflow-clip rounded-xl border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Miembros activos</TableHead>
                        <TableHead>Invitaciones pendientes</TableHead>
                        <TableHead>Actualizada</TableHead>
                        <TableHead className="w-[84px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow
                          key={company.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/companies/${company.id}`)}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1 py-1">
                              <span className="font-medium text-foreground">{company.name}</span>
                              <span className="text-xs text-muted-foreground">/{company.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={company.isActive ? 'secondary' : 'outline'}>
                              {company.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{company.activeMemberCount}</TableCell>
                          <TableCell>{company.pendingInvitationCount}</TableCell>
                          <TableCell>{formatDate(company.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal />
                                    <span className="sr-only">Abrir acciones</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); router.push(`/companies/${company.id}`) }}>Abrir detalle</DropdownMenuItem>
                                    {canUpdateCompany ? <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setEditTarget(company) }}>Editar</DropdownMenuItem> : null}
                                    {canInviteMember ? <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setInviteTarget(company) }}>Invitar miembro</DropdownMenuItem> : null}
                                    {canUpdateStatus ? (
                                      <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setStatusTarget(company) }}>
                                        {company.isActive ? 'Desactivar' : 'Reactivar'}
                                      </DropdownMenuItem>
                                    ) : null}
                                 </DropdownMenuContent>
                               </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {hub?.page ?? 1} de {hub?.totalPages ?? 1} · {hub?.totalItems ?? 0} companies
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= (hub?.totalPages ?? 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
      </Card>

      <CompanyFormDialog
        open={createOpen}
        mode="create"
        submitting={submitting === 'create'}
        error={formError}
        onOpenChange={setCreateOpen}
        onSubmit={async (payload) => {
          setSubmitting('create')
          setFormError(null)

          try {
            const result = await companyService.createCompany(payload)
            toast.success('Company creada', {
              description: 'La nueva company ya está disponible para operar.',
            })
            setCreateOpen(false)
            await refetch()
            router.push(`/companies/${result.company.id}`)
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'No se pudo crear la company.')
          } finally {
            setSubmitting(null)
          }
        }}
      />

      <CompanyFormDialog
        open={Boolean(editTarget)}
        mode="edit"
        company={editTarget}
        submitting={submitting === 'edit'}
        error={formError}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            setFormError(null)
          }
        }}
        onSubmit={async (payload) => {
          if (!editTarget) return

          setSubmitting('edit')
          setFormError(null)

          try {
            await companyService.updateCompany(editTarget.id, payload)
            toast.success('Company actualizada')
            setEditTarget(null)
            await refetch()
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'No se pudo actualizar la company.')
          } finally {
            setSubmitting(null)
          }
        }}
      />

      <InviteMemberDialog
        open={Boolean(inviteTarget)}
        companyName={inviteTarget?.name ?? null}
        allowedRoles={allowedInviteRoles}
        submitting={submitting === 'invite'}
        error={inviteError}
        onOpenChange={(open) => {
          if (!open) {
            setInviteTarget(null)
            setInviteError(null)
          }
        }}
        onSubmit={async (payload) => {
          if (!inviteTarget) return

          setSubmitting('invite')
          setInviteError(null)

          try {
            const result = await companyService.createInvitation(inviteTarget.id, payload)
            toast.success(result.delivery.sent ? 'Email enviado' : 'Invitación lista para compartir', {
              description: result.delivery.sent
                ? 'La invitación se envió por email y quedó registrada.'
                : result.inviteUrl
                  ? `Compartí manualmente este enlace: ${result.inviteUrl}`
                  : 'La invitación quedó registrada, pero el email no pudo confirmarse.',
            })
            setInviteTarget(null)
            await refetch()
          } catch (err) {
            setInviteError(err instanceof Error ? err.message : 'No se pudo enviar la invitación.')
          } finally {
            setSubmitting(null)
          }
        }}
      />

      <CompanyConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.isActive ? 'Desactivar company' : 'Reactivar company'}
        description={statusTarget
          ? `La company ${statusTarget.name} ${statusTarget.isActive ? 'quedará inactiva' : 'volverá a estar activa'} para la operación interna.`
          : ''}
        confirmLabel={statusTarget?.isActive ? 'Desactivar' : 'Reactivar'}
        tone={statusTarget?.isActive ? 'destructive' : 'default'}
        submitting={submitting === 'status'}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        onConfirm={async () => {
          if (!statusTarget) return

          setSubmitting('status')

          try {
            await companyService.updateCompanyStatus(statusTarget.id, statusTarget.isActive ? 'inactive' : 'active')
            toast.success(statusTarget.isActive ? 'Company desactivada' : 'Company reactivada')
            setStatusTarget(null)
            await refetch()
          } finally {
            setSubmitting(null)
          }
        }}
      />
    </div>
  )
}
