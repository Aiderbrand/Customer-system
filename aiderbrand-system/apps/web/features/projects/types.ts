import type { ProjectStatus, ProjectWorkspaceTabId } from '@/lib/types'

export interface ProjectFilters {
  companyId?: string | null
  search?: string
  status?: ProjectStatus[]
}

export interface ProjectSectionTab {
  id: ProjectWorkspaceTabId
  label: string
  audience: 'shared' | 'internal'
}

export const PROJECT_WORKSPACE_TABS: ProjectSectionTab[] = [
  { id: 'plan',       label: 'Plan',             audience: 'shared'   },
  { id: 'tickets',    label: 'Tickets',           audience: 'shared'   },
  { id: 'activity',   label: 'Actividad',         audience: 'shared'   },
  { id: 'team_notes', label: 'Notas del equipo',  audience: 'internal' },
]
