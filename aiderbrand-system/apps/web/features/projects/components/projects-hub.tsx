'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, Building2, MoreHorizontal, ShieldAlert, Ticket } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import type { Company, ProjectAudience, ProjectHubItem, ProjectHubSummary } from '@/lib/types'
import {
  getProjectHealthLabel,
  PROJECT_STATUS_LABELS,
} from '@/features/projects/lib/project-selectors'
import { AppPageHeader } from '@/components/layout/app-page'
import type { ProjectFilters } from '@/features/projects/types'
import { ProjectsHubFilters } from '@/features/projects/components/projects-hub-filters'
import { ProjectsHubSummary } from '@/features/projects/components/projects-hub-summary'

interface ProjectsHubProps {
  summary: ProjectHubSummary | null
  projects: ProjectHubItem[]
  audience: ProjectAudience
  filters: Required<ProjectFilters>
  companyOptions: Company[]
  onCompanyChange: (value: string | null) => void
  onSearchChange: (value: string) => void
  onToggleStatus: (status: ProjectHubItem['status']) => void
  onClearFilters: () => void
  statusOptions: Array<{ value: ProjectHubItem['status']; label: string }>
  actions?: React.ReactNode
  emptyState?: React.ReactNode
}

function SortableHeader({ column, label }: { column: Column<ProjectHubItem, unknown>; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-muted-foreground hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  )
}

export function ProjectsHub({
  summary,
  projects,
  audience,
  filters,
  companyOptions,
  onCompanyChange,
  onSearchChange,
  onToggleStatus,
  onClearFilters,
  statusOptions,
  actions,
  emptyState,
}: ProjectsHubProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }])

  const columns = useMemo<ColumnDef<ProjectHubItem>[]>(() => {
    const baseColumns: ColumnDef<ProjectHubItem>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} label="Proyecto" />,
        cell: ({ row }) => {
          const project = row.original

          return (
            <div className="flex min-w-0 flex-col gap-1 py-1">
              <Button asChild variant="link" className="h-auto w-fit px-0 text-left text-sm font-medium text-foreground">
                <Link href={`/projects/${project.id}`}>{project.name}</Link>
              </Button>
              <p className="max-w-[420px] truncate text-xs text-muted-foreground">
                {project.description || 'Sin descripción'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column} label="Estado" />,
        cell: ({ row }) => <Badge variant="outline">{PROJECT_STATUS_LABELS[row.original.status]}</Badge>,
      },
      {
        accessorKey: 'currentPhase',
        header: ({ column }) => <SortableHeader column={column} label="Fase actual" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.currentPhase ?? 'Sin definir'}</span>
        ),
      },
      {
        accessorKey: 'progressPct',
        header: ({ column }) => <SortableHeader column={column} label="Progreso" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {row.original.progressPct !== null ? `${row.original.progressPct}%` : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'openTicketCount',
        header: ({ column }) => <SortableHeader column={column} label="Tickets abiertos" />,
        cell: ({ row }) => (
          <Badge variant="secondary" className="gap-1.5">
            <Ticket className="size-3.5" />
            {row.original.openTicketCount}
          </Badge>
        ),
      },
      {
        accessorKey: 'nextMilestone',
        header: ({ column }) => <SortableHeader column={column} label="Próximo hito" />,
        cell: ({ row }) => (
          <span className="max-w-[180px] truncate text-sm text-muted-foreground">
            {row.original.nextMilestone ?? 'Sin hito próximo'}
          </span>
        ),
      },
    ]

    if (audience === 'internal') {
      baseColumns.splice(1, 0, {
        accessorKey: 'companyName',
        header: ({ column }) => <SortableHeader column={column} label="Cuenta" />,
        cell: ({ row }) => (
          <Badge variant="secondary" className="gap-1.5 font-normal text-muted-foreground">
            <Building2 className="size-3.5" />
            {row.original.companyName ?? 'Sin cuenta'}
          </Badge>
        ),
      })
    }

    if (audience === 'internal') {
      baseColumns.push({
        accessorKey: 'health',
        header: ({ column }) => <SortableHeader column={column} label="Salud" />,
        cell: ({ row }) => (
          row.original.health ? (
            <Badge variant="outline" className="gap-1.5">
              <ShieldAlert className="size-3.5" />
              {getProjectHealthLabel(row.original.health)}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Sin señal</span>
          )
        ),
      })
    }

    baseColumns.push(
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <SortableHeader column={column} label="Actualizado" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${row.original.id}?section=tickets`}>Tickets</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}`}>Abrir workspace</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}`}>Ver fases</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}?section=tickets`}>Ver tickets</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    )

    return baseColumns
  }, [audience])

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        title="Proyectos"
        badge={<Badge variant="secondary">{projects.length}</Badge>}
        description={
          audience === 'internal'
            ? 'Hub operativo tabla-first para escanear estado, fases visibles y señales de riesgo del equipo.'
            : 'Seguimiento claro de proyectos, fases visibles y próximos hitos desde una sola vista.'
        }
        actions={actions}
      />

      <ProjectsHubSummary summary={summary} audience={audience} />

      <Card>
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle>Listado principal</CardTitle>
            <CardDescription>
              Priorizado para escaneo rápido, comparación y acceso directo al workspace.
            </CardDescription>
          </div>
          <ProjectsHubFilters
            filters={filters}
            companyOptions={companyOptions}
            statusOptions={statusOptions}
            onCompanyChange={onCompanyChange}
            onSearchChange={onSearchChange}
            onToggleStatus={onToggleStatus}
            onClearFilters={onClearFilters}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          {emptyState ?? (
            <>
              <div className="overflow-clip rounded-xl border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

               <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <p className="text-sm text-muted-foreground">
                   {projects.length} proyecto{projects.length === 1 ? '' : 's'} en la vista actual
                 </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value)
}
