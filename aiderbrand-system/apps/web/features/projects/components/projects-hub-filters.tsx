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
import type { Company, ProjectStatus } from '@/lib/types'
import type { ProjectFilters } from '@/features/projects/types'

interface ProjectsHubFiltersProps {
  filters: Required<ProjectFilters>
  companyOptions: Company[]
  statusOptions: Array<{ value: ProjectStatus; label: string }>
  onCompanyChange: (value: string | null) => void
  onSearchChange: (value: string) => void
  onToggleStatus: (status: ProjectStatus) => void
  onClearFilters: () => void
}

export function ProjectsHubFilters({
  filters,
  companyOptions,
  statusOptions,
  onCompanyChange,
  onSearchChange,
  onToggleStatus,
  onClearFilters,
}: ProjectsHubFiltersProps) {
  const hasActiveFilters = Boolean(filters.companyId) || Boolean(filters.search.trim()) || filters.status.length > 0

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre, descripción o fase"
          className="pl-9"
        />
      </div>

      {companyOptions.length > 1 ? (
        <Select value={filters.companyId ?? 'all'} onValueChange={(value) => onCompanyChange(value === 'all' ? null : value)}>
          <SelectTrigger className="w-full lg:w-[220px]">
            <SelectValue placeholder="Todas las companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las companies</SelectItem>
            {companyOptions.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => {
          const isActive = filters.status.includes(option.value)

          return (
            <Button
              key={option.value}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggleStatus(option.value)}
            >
              {option.label}
            </Button>
          )
        })}

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onClearFilters()}>
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
