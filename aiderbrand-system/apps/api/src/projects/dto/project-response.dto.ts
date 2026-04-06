import type { PhaseStatus, Priority, ProjectStatus, TaskStatus } from '@prisma/client'

export type ProjectAudience = 'internal' | 'client'
export type ProjectHealthStatus = 'on-track' | 'at-risk' | 'breached'

export type ProjectDto = {
  id: string
  companyId: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type PhaseSummaryDto = {
  id: string
  projectId: string
  name: string
  order: number
  status: PhaseStatus
  startsAt: string | null
  dueAt: string | null
  completedAt: string | null
  ownerUserId: string | null
  ownerName: string | null
  milestone: string | null
  blocker: string | null
  isClientVisible: boolean
}

export type TaskSummaryDto = {
  id: string
  projectId: string
  phaseId: string | null
  title: string
  status: TaskStatus
  completionType: string | null
  priority: Priority
  assigneeUserId: string | null
  assigneeName: string | null
  dueAt: string | null
  dueState: 'on-track' | 'at-risk' | 'breached' | 'no-deadline'
  dependencyTaskId: string | null
  blockReason: string | null
  resolutionNote: string | null
  visibleToClient: boolean
  checklist: Array<{ id: string; label: string; done: boolean }>
}

export type ProjectHubItemDto = {
  id: string
  companyId: string
  companyName: string | null
  name: string
  description: string
  status: ProjectStatus
  currentPhase: string | null
  progressPct: number | null
  targetLaunchAt: string | null
  updatedAt: string
  createdAt: string
  ticketCount: number
  openTicketCount: number
  nextMilestone: string | null
  health: ProjectHealthStatus | null
  phases: PhaseSummaryDto[]
}

export type ProjectHubSummaryDto = {
  totalProjects: number
  activeProjects: number
  pausedProjects: number
  projectsWithOpenTickets: number
  projectsAtRisk: number | null
}

export type ProjectHubResponseDto = {
  audience: ProjectAudience
  summary: ProjectHubSummaryDto
  items: ProjectHubItemDto[]
}

export type ProjectWorkspaceSummaryDto = {
  openTickets: number
  visiblePhases: number
  nextMilestone: string | null
  health: ProjectHealthStatus | null
}

export type ProjectAdminDto = {
  projectLeadId: string | null
  projectLeadName: string | null
  deliveryOwnerId: string | null
  deliveryOwnerName: string | null
  targetLaunchAt: string | null
  lastUpdatedAt: string
  isDependencyReady: boolean
}

export type ProjectNoteDto = {
  id: string
  projectId: string
  phaseId: string | null
  authorId: string
  authorName: string
  body: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectWorkspaceInternalDto = {
  tasks: TaskSummaryDto[]
  notes: ProjectNoteDto[]
  admin: ProjectAdminDto
}

export type ProjectActivityEventDto = {
  id: string
  projectId: string
  type: 'project' | 'phase' | 'ticket' | 'note'
  label: string
  description: string
  happenedAt: string
  actorUserId: string | null
}

export type ProjectWorkspaceResponseDto = {
  audience: ProjectAudience
  project: {
    id: string
    companyId: string
    companyName: string | null
    name: string
    description: string
    status: ProjectStatus
    currentPhase: string | null
    progressPct: number | null
    targetLaunchAt: string | null
    updatedAt: string
    createdAt: string
  }
  summary: ProjectWorkspaceSummaryDto
  phases: PhaseSummaryDto[]
  tasks: TaskSummaryDto[]
  tickets: Array<{
    id: string
    title: string
    status: string
    priority: string
  }>
  activity: ProjectActivityEventDto[]
  internal?: ProjectWorkspaceInternalDto
}
