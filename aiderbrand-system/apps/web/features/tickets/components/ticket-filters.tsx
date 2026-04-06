import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import type { TicketFilterState } from '@/features/tickets/types'
import type { Company, Priority } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketFiltersProps {
  filters: TicketFilterState
  onChange: (filters: TicketFilterState) => void
  showCompanyFilter?: boolean
  companies?: Company[]
  showProjectFilter?: boolean
  projects?: { id: string; name: string }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketFilters — horizontal filter bar with search, status, priority and
 * optional project selects.
 *
 * Search is debounced 300ms via setTimeout.
 * Pure presentational — all state lives in the parent.
 */
export function TicketFilters({
  filters,
  onChange,
  showCompanyFilter = false,
  companies = [],
  showProjectFilter = false,
  projects = [],
}: TicketFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState(filters.search)

  useEffect(() => {
    setSearchValue(filters.search)
  }, [filters.search])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchValue(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value })
    }, 300)
  }

  function handlePriorityChange(value: string) {
    const newPriority = value === 'all' ? [] : [value as Priority]
    onChange({ ...filters, priority: newPriority })
  }

  function handleProjectChange(value: string) {
    onChange({ ...filters, projectId: value === 'all' ? undefined : value })
  }

  function handleCompanyChange(value: string) {
    onChange({ ...filters, companyId: value === 'all' ? undefined : value })
  }

  function handleClear() {
    setSearchValue('')
    onChange({
      companyId: undefined,
      status: [],
      priority: [],
      assignedToId: filters.assignedToId,
      projectId: undefined,
      search: '',
    })
  }

  const selectedPriority = filters.priority.length === 1 ? filters.priority[0] : 'all'
  const selectedCompany = filters.companyId ?? 'all'
  const selectedProject = filters.projectId ?? 'all'
  const hasActiveFilters = Boolean(filters.companyId || filters.search.trim() || filters.priority.length || filters.projectId)

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar tickets..."
            value={searchValue}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>

        <Select value={selectedPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCompanyFilter && (
          <Select value={selectedCompany} onValueChange={handleCompanyChange}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showProjectFilter && (
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleClear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
