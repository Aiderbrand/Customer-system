import type {
  ProjectCanonicalContext,
  ProjectHealthStatus,
  ProjectHubItem,
  ProjectNote,
  ProjectPendingTaskSummary,
  ProjectStatus,
  ProjectWorkspacePayload,
  ProjectWorkspaceTabId,
  Role,
} from '@/lib/types'
import { getVisibleProjectTabs, hasPermission } from '@/lib/rbac'
import {
  PROJECT_WORKSPACE_TABS,
  type ProjectFilters,
  type ProjectSectionTab,
} from '@/features/projects/types'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planificacion: 'Planificación',
  desarrollo: 'Desarrollo',
  pruebas: 'Pruebas',
  revision_cliente: 'Revisión cliente',
  produccion: 'Producción',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
}

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value: value as ProjectStatus,
  label,
}))

export const PROJECT_TASK_STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  bloqueada: 'Bloqueada',
  completada: 'Completada',
} as const

export const PROJECT_TASK_PRIORITY_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
} as const

export const PROJECT_TASK_DUE_STATE_LABELS = {
  'on-track': 'En fecha',
  'at-risk': 'En riesgo',
  breached: 'Vencida',
  'no-deadline': 'Sin fecha',
} as const

export function getProjectHealthFromTasks(
  tasks: ProjectPendingTaskSummary[],
): ProjectHealthStatus | null {
  const openTimedTasks = tasks.filter(task => task.status !== 'completada' && task.dueState !== 'no-deadline')

  if (openTimedTasks.length === 0) {
    return null
  }

  if (openTimedTasks.some(task => task.dueState === 'breached')) {
    return 'breached'
  }

  if (openTimedTasks.some(task => task.dueState === 'at-risk')) {
    return 'at-risk'
  }

  return 'on-track'
}

export function getProjectHealthLabel(health: ProjectHealthStatus | null): string {
  switch (health) {
    case 'on-track':
      return 'En curso'
    case 'at-risk':
      return 'En riesgo'
    case 'breached':
      return 'Comprometido'
    default:
      return 'Sin señal'
  }
}

export function getProjectHealthTone(health: ProjectHealthStatus | null): 'default' | 'secondary' | 'destructive' {
  switch (health) {
    case 'breached':
      return 'destructive'
    case 'at-risk':
      return 'secondary'
    default:
      return 'default'
  }
}

export function getProjectNextMilestone(
  phases: Array<{ status: string; milestone: string | null }>,
): string | null {
  return phases.find(phase => phase.status !== 'completada' && phase.milestone)?.milestone ?? null
}

export function selectCanonicalProjectContext(project: ProjectCanonicalContext): ProjectCanonicalContext {
  return {
    ...project,
  }
}

export function getProjectTaskDisplayStatus(task: ProjectPendingTaskSummary): string {
  if (task.status === 'completada' && task.completionType === 'not_applicable') {
    return 'No corresponde'
  }

  return PROJECT_TASK_STATUS_LABELS[task.status]
}

export function getProjectTaskAudienceLabel(role: Role): 'Tarea' | 'Pedido' {
  return role === 'ACCOUNT_OWNER' || role === 'COLLABORATOR' ? 'Pedido' : 'Tarea'
}

export function getVisibleWorkspaceTasks(
  workspace: Pick<ProjectWorkspacePayload, 'tasks'>,
): ProjectPendingTaskSummary[] {
  return workspace.tasks
}

export function getTasksForPhase(tasks: ProjectPendingTaskSummary[], phaseId: string): ProjectPendingTaskSummary[] {
  return tasks.filter((task) => task.phaseId === phaseId)
}

export function getNotesForPhase(notes: ProjectNote[], phaseId: string | null): ProjectNote[] {
  return notes.filter((note) => note.phaseId === phaseId)
}

export function canManageProjectTasks(role: Role): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'PROJECT_LEAD' || role === 'DELIVERY_SPECIALIST'
}

export function canCompleteProjectTask(
  role: Role,
  currentUserId: string | null,
  task: ProjectPendingTaskSummary,
): boolean {
  return canManageProjectTasks(role) && Boolean(currentUserId) && task.assigneeUserId === currentUserId
}

export function canBlockProjectTask(role: Role): boolean {
  return canManageProjectTasks(role)
}

export function canCreateProjectTaskDependency(role: Role): boolean {
  return canManageProjectTasks(role)
}

export function canMarkProjectTaskNotApplicable(role: Role): boolean {
  return canManageProjectTasks(role)
}

export function canEditProjectWorkspace(role: Role, workspace: ProjectWorkspacePayload): boolean {
  return hasPermission(role, 'projects:edit') && Boolean(workspace.internal?.admin.isDependencyReady)
}

export function getProjectPhaseName(
  workspace: Pick<ProjectWorkspacePayload, 'phases'>,
  phaseId: string | null,
): string {
  if (!phaseId) {
    return 'General'
  }

  return workspace.phases.find((phase) => phase.id === phaseId)?.name ?? 'Fase sin nombre'
}

export function getProjectTaskSummary(tasks: ProjectPendingTaskSummary[]) {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'completada').length,
    blocked: tasks.filter((task) => task.status === 'bloqueada').length,
    own: tasks.filter((task) => task.assigneeUserId !== null).length,
  }
}

export function filterProjectHubItems(items: ProjectHubItem[], filters: ProjectFilters): ProjectHubItem[] {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? ''
  const selectedStatuses = filters.status ?? []

  return items.filter((item) => {
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(item.status)
    const matchesSearch = normalizedSearch.length === 0
      || item.name.toLowerCase().includes(normalizedSearch)
      || item.description.toLowerCase().includes(normalizedSearch)
      || item.currentPhase?.toLowerCase().includes(normalizedSearch)

    return matchesStatus && matchesSearch
  })
}

export function getProjectsHubEmptyState(params: {
  totalItems: number
  filteredItemsCount: number
  filters: ProjectFilters
}) {
  const { totalItems, filteredItemsCount, filters } = params
  const hasFilters = Boolean(filters.search?.trim()) || Boolean(filters.status?.length)

  if (totalItems === 0) {
    return {
      title: 'Todavía no hay proyectos en esta cuenta',
      description: 'Cuando se publiquen proyectos vas a ver acá el estado, las fases visibles y los próximos hitos.',
      canReset: false,
    }
  }

  if (filteredItemsCount === 0 && hasFilters) {
    return {
      title: 'No encontramos proyectos con ese criterio',
      description: 'Probá limpiar la búsqueda o cambiar los estados seleccionados para volver al hub completo.',
      canReset: true,
    }
  }

  return null
}

export function getProjectWorkspaceTabs(role: Role): ProjectSectionTab[] {
  const visibleTabs = new Set(getVisibleProjectTabs(role))

  return PROJECT_WORKSPACE_TABS.filter(tab => visibleTabs.has(tab.id))
}

export function resolveProjectWorkspaceTab(role: Role, requestedTab: string | null | undefined): ProjectWorkspaceTabId {
  const visibleTabs = getProjectWorkspaceTabs(role)
  const fallbackTab = visibleTabs[0]?.id ?? 'plan'
  const normalizedRequestedTab = requestedTab === 'phases' ? 'plan' : requestedTab

  if (!normalizedRequestedTab) {
    return fallbackTab
  }

  return visibleTabs.some(tab => tab.id === normalizedRequestedTab)
    ? normalizedRequestedTab as ProjectWorkspaceTabId
    : fallbackTab
}

export function getProjectWorkspaceEmptyState(
  tabId: ProjectWorkspaceTabId,
  workspace: ProjectWorkspacePayload,
): { title: string; description: string } | null {
  switch (tabId) {
    case 'plan':
      return workspace.phases.length === 0
        ? {
            title: 'Sin fases en este proyecto',
            description: 'Creá la primera fase para organizar el trabajo del equipo.',
          }
        : null
    case 'tickets':
      if (workspace.phases.length === 0) {
        return {
          title: 'El proyecto no tiene fases configuradas',
          description: 'Definí el plan del proyecto en la pestaña Plan antes de asociar tickets.',
        }
      }
      // When phases exist, always show TicketListContainer — it handles its own empty state and create flow
      return null
    case 'activity':
      return workspace.activity.length === 0
        ? {
            title: 'Sin actividad reciente',
            description: 'Los cambios relevantes del proyecto van a aparecer acá como historial de contexto.',
          }
        : null
    case 'team_notes':
      if (workspace.phases.length === 0) {
        return {
          title: 'El proyecto no tiene fases configuradas',
          description: 'Definí el plan del proyecto en la pestaña Plan antes de agregar notas del equipo.',
        }
      }
      // When phases exist, always show the section — the form handles the "no notes" state internally
      return null
    default:
      return null
  }
}
