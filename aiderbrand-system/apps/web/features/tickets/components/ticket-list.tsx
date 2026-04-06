'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  CalendarClock,
  FolderKanban,
  MoreHorizontal,
  UserRound,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

import { TicketPriorityBadge } from '@/features/tickets/components/ticket-priority-badge'
import { TicketSlaIndicator } from '@/features/tickets/components/ticket-sla-indicator'
import { TicketStatusBadge } from '@/features/tickets/components/ticket-status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { Project, ProjectWithStats, Ticket } from '@/lib/types'

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
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function SortableHeader({
  column,
  label,
  align = 'left',
}: {
  column: Column<Ticket, unknown>
  label: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'flex justify-end' : 'flex justify-start'}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        <ArrowUpDown className="size-3.5" />
      </Button>
    </div>
  )
}

interface TicketListProps {
  tickets: Ticket[]
  projects: ProjectWithStats[] | Project[]
  onTicketClick: (ticketId: string) => void
}

export function TicketList({ tickets, projects, onTicketClick }: TicketListProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <SortableHeader column={column} label="Ticket" />,
        enableHiding: false,
        cell: ({ row }) => {
          const ticket = row.original
          return (
            <div className="flex min-w-0 flex-col gap-1.5 py-1">
              <Button
                variant="link"
                className="h-auto w-fit px-0 text-left text-sm font-medium text-foreground"
                onClick={() => onTicketClick(ticket.id)}
              >
                {ticket.title}
              </Button>
              <p className="truncate text-xs text-muted-foreground">
                {ticket.description || 'Sin descripción'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column} label="Estado" />,
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <SortableHeader column={column} label="Prioridad" />,
        cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
      },
      {
        id: 'project',
        accessorFn: (row) => projectMap.get(row.projectId ?? '')?.name ?? 'Sin proyecto',
        header: ({ column }) => <SortableHeader column={column} label="Proyecto" />,
        cell: ({ row }) => {
          const project = row.original.projectId ? projectMap.get(row.original.projectId) : null

          return project ? (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <FolderKanban className="size-3.5" />
              {project.name}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground/70">Sin proyecto</span>
          )
        },
      },
      {
        id: 'assignee',
        accessorFn: (row) => row.assignedToName ?? 'Sin asignar',
        header: ({ column }) => <SortableHeader column={column} label="Asignado" />,
        cell: ({ row }) => {
          const name = row.original.assignedToName ?? null

          return name ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <span className="max-w-32 truncate text-sm">{name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-3.5" />
              <span className="text-xs">Sin asignar</span>
            </div>
          )
        },
      },
      {
        id: 'sla',
        accessorFn: (row) => row.slaDeadline,
        header: () => <div className="text-right text-sm font-medium text-muted-foreground">SLA</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <TicketSlaIndicator
              deadline={row.original.slaDeadline}
              createdAt={row.original.createdAt}
              showLabel={false}
              className="min-w-[90px]"
            />
          </div>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <SortableHeader column={column} label="Actualizado" align="right" />,
        cell: ({ row }) => (
          <div className="text-right text-xs text-muted-foreground">
            {formatDate(row.original.updatedAt)}
          </div>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onTicketClick(row.original.id)}>
                Ver ticket
              </DropdownMenuItem>
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onTicketClick, projectMap],
  )

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-4" />
          {tickets.length} ticket{tickets.length === 1 ? '' : 's'} en esta vista
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  className="capitalize"
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-4">
                  <EmptyState
                    icon={FolderKanban}
                    title="No hay tickets para mostrar"
                    description="Probá ajustar los filtros o crear un ticket nuevo dentro del alcance actual."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
        </div>

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
    </div>
  )
}
