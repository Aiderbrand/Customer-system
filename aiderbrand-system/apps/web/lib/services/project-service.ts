import { apiClient } from '@/lib/api/client'
import type {
  CreatePhaseDTO,
  CreateProjectDTO,
  CreateProjectTaskDTO,
  Project,
  ProjectHubPayload,
  ProjectNote,
  ProjectPendingTaskSummary,
  ProjectPhaseSummary,
  ProjectWithStats,
  ProjectWorkspacePayload,
  ProjectWorkspaceViewerContext,
  ReorderPhasesDTO,
  Role,
  SendNoteDTO,
  UpdatePhaseDTO,
  UpdateProjectTaskDTO,
} from '@/lib/types'

// ─── Interface ────────────────────────────────────────────────────────────────

interface ProjectService {
  getProjects(companyIds?: string[]): Promise<ProjectWithStats[]>
  getProject(companyId: string, id: string): Promise<ProjectWithStats | null>
  getProjectsHub(role: Role, options?: { companyIds?: string[] }): Promise<ProjectHubPayload>
  getProjectWorkspace(
    accessibleCompanyIds: string[],
    projectId: string,
    viewer: ProjectWorkspaceViewerContext,
  ): Promise<ProjectWorkspacePayload | null>
  createProject(companyId: string, dto: CreateProjectDTO): Promise<Project>
  createPhase(projectId: string, dto: CreatePhaseDTO): Promise<ProjectPhaseSummary>
  updatePhase(projectId: string, phaseId: string, dto: UpdatePhaseDTO): Promise<ProjectPhaseSummary>
  deletePhase(projectId: string, phaseId: string): Promise<void>
  reorderPhases(projectId: string, dto: ReorderPhasesDTO): Promise<void>
  createProjectTask(companyId: string, projectId: string, dto: CreateProjectTaskDTO): Promise<ProjectPendingTaskSummary>
  updateProjectTask(companyId: string, projectId: string, taskId: string, dto: UpdateProjectTaskDTO): Promise<ProjectPendingTaskSummary>
  deleteProjectTask(companyId: string, projectId: string, taskId: string): Promise<void>
  sendNote(projectId: string, dto: SendNoteDTO): Promise<ProjectNote>
}

// ─── API response types ───────────────────────────────────────────────────────

interface ApiPhaseSummary {
  id: string
  projectId: string
  name: string
  order: number
  status: string
  startsAt: string | null
  dueAt: string | null
  completedAt: string | null
  ownerUserId: string | null
  ownerName: string | null
  milestone: string | null
  blocker: string | null
  isClientVisible: boolean
}

interface ApiTaskSummary {
  id: string
  projectId: string
  phaseId: string | null
  title: string
  status: string
  completionType: string | null
  priority: string
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

interface ApiHubItem {
  id: string
  companyId: string
  companyName: string | null
  name: string
  description: string
  status: string
  currentPhase: string | null
  progressPct: number | null
  targetLaunchAt: string | null
  updatedAt: string
  createdAt: string
  ticketCount: number
  openTicketCount: number
  nextMilestone: string | null
  health: 'on-track' | 'at-risk' | 'breached' | null
  phases: ApiPhaseSummary[]
}

interface ApiHubResponse {
  audience: 'internal' | 'client'
  summary: {
    totalProjects: number
    activeProjects: number
    pausedProjects: number
    projectsWithOpenTickets: number
    projectsAtRisk: number | null
  }
  items: ApiHubItem[]
}

interface ApiWorkspaceResponse {
  audience: 'internal' | 'client'
  project: {
    id: string
    companyId: string
    companyName: string | null
    name: string
    description: string
    status: string
    currentPhase: string | null
    progressPct: number | null
    targetLaunchAt: string | null
    updatedAt: string
    createdAt: string
  }
  summary: {
    openTickets: number
    visiblePhases: number
    nextMilestone: string | null
    health: 'on-track' | 'at-risk' | 'breached' | null
  }
  phases: ApiPhaseSummary[]
  tasks: ApiTaskSummary[]
  tickets: Array<{ id: string; title: string; status: string; priority: string }>
  activity: Array<{
    id: string
    projectId: string
    type: string
    label: string
    description: string
    happenedAt: string
    actorUserId: string | null
  }>
  internal?: {
    tasks: ApiTaskSummary[]
    notes: Array<{
      id: string
      projectId: string
      phaseId: string | null
      authorId: string
      authorName: string
      body: string
      parentId: string | null
      createdAt: string
      updatedAt: string
    }>
    admin: {
      projectLeadId: string | null
      projectLeadName: string | null
      deliveryOwnerId: string | null
      deliveryOwnerName: string | null
      targetLaunchAt: string | null
      lastUpdatedAt: string
      isDependencyReady: boolean
    }
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toPhase(raw: ApiPhaseSummary): ProjectPhaseSummary {
  return {
    id: raw.id,
    projectId: raw.projectId,
    name: raw.name,
    order: raw.order,
    status: raw.status as ProjectPhaseSummary['status'],
    startsAt: raw.startsAt ? new Date(raw.startsAt) : null,
    dueAt: raw.dueAt ? new Date(raw.dueAt) : null,
    completedAt: raw.completedAt ? new Date(raw.completedAt) : null,
    ownerUserId: raw.ownerUserId,
    ownerName: raw.ownerName,
    milestone: raw.milestone,
    blocker: raw.blocker,
    isClientVisible: raw.isClientVisible,
  }
}

function toTask(raw: ApiTaskSummary): ProjectPendingTaskSummary {
  return {
    id: raw.id,
    projectId: raw.projectId,
    phaseId: raw.phaseId,
    title: raw.title,
    status: raw.status as ProjectPendingTaskSummary['status'],
    completionType: raw.completionType as ProjectPendingTaskSummary['completionType'],
    priority: raw.priority as ProjectPendingTaskSummary['priority'],
    assigneeUserId: raw.assigneeUserId,
    assigneeName: raw.assigneeName,
    dueAt: raw.dueAt ? new Date(raw.dueAt) : null,
    dueState: raw.dueState,
    dependencyTaskId: raw.dependencyTaskId,
    blockReason: raw.blockReason,
    resolutionNote: raw.resolutionNote,
    visibleToClient: raw.visibleToClient,
    checklist: raw.checklist,
  }
}

function toHubItem(raw: ApiHubItem): ProjectHubPayload['items'][number] {
  return {
    id: raw.id,
    companyId: raw.companyId,
    companyName: raw.companyName,
    name: raw.name,
    description: raw.description,
    status: raw.status as Project['status'],
    currentPhase: raw.currentPhase,
    progressPct: raw.progressPct,
    targetLaunchAt: raw.targetLaunchAt ? new Date(raw.targetLaunchAt) : null,
    updatedAt: new Date(raw.updatedAt),
    createdAt: new Date(raw.createdAt),
    ticketCount: raw.ticketCount,
    openTicketCount: raw.openTicketCount,
    nextMilestone: raw.nextMilestone,
    health: raw.health,
    phases: raw.phases.map(toPhase),
  }
}

// ─── HTTP Implementation ───────────────────────────────────────────────────────

class HttpProjectService implements ProjectService {
  async getProjectsHub(
    _role: Role,
    options?: { companyIds?: string[] },
  ): Promise<ProjectHubPayload> {
    const companyIdsParam = options?.companyIds?.join(',') ?? ''
    const query = companyIdsParam ? `?companyIds=${encodeURIComponent(companyIdsParam)}` : ''
    const data = await apiClient.request<ApiHubResponse>(`/projects/hub${query}`)

    return {
      audience: data.audience,
      summary: data.summary,
      items: data.items.map(toHubItem),
    }
  }

  async getProjects(companyIds?: string[]): Promise<ProjectWithStats[]> {
    const companyIdsParam = companyIds?.join(',') ?? ''
    const query = companyIdsParam ? `?companyIds=${encodeURIComponent(companyIdsParam)}` : ''
    const data = await apiClient.request<ApiHubResponse>(`/projects/hub${query}`)

    return data.items.map((item) => ({
      id: item.id,
      companyId: item.companyId,
      name: item.name,
      description: item.description,
      status: item.status as Project['status'],
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      ticketCount: item.ticketCount,
      openTicketCount: item.openTicketCount,
    }))
  }

  async getProject(companyId: string, id: string): Promise<ProjectWithStats | null> {
    const data = await apiClient.request<ApiHubResponse>(
      `/projects/hub?companyIds=${encodeURIComponent(companyId)}`,
    )
    const found = data.items.find((item) => item.id === id)
    if (!found) return null

    return {
      id: found.id,
      companyId: found.companyId,
      name: found.name,
      description: found.description,
      status: found.status as Project['status'],
      createdAt: new Date(found.createdAt),
      updatedAt: new Date(found.updatedAt),
      ticketCount: found.ticketCount,
      openTicketCount: found.openTicketCount,
    }
  }

  async getProjectWorkspace(
    _accessibleCompanyIds: string[],
    projectId: string,
    _viewer: ProjectWorkspaceViewerContext,
  ): Promise<ProjectWorkspacePayload | null> {
    try {
      const data = await apiClient.request<ApiWorkspaceResponse>(
        `/projects/${projectId}/workspace`,
      )

      const result: ProjectWorkspacePayload = {
        audience: data.audience,
        project: {
          id: data.project.id,
          companyId: data.project.companyId,
          companyName: data.project.companyName,
          name: data.project.name,
          description: data.project.description,
          status: data.project.status as Project['status'],
          currentPhase: data.project.currentPhase,
          progressPct: data.project.progressPct,
          targetLaunchAt: data.project.targetLaunchAt ? new Date(data.project.targetLaunchAt) : null,
          updatedAt: new Date(data.project.updatedAt),
          createdAt: new Date(data.project.createdAt),
        },
        summary: {
          openTickets: data.summary.openTickets,
          visiblePhases: data.summary.visiblePhases,
          nextMilestone: data.summary.nextMilestone,
          health: data.summary.health,
        },
        phases: data.phases.map(toPhase),
        tasks: data.tasks.map(toTask),
        tickets: data.tickets as ProjectWorkspacePayload['tickets'],
        activity: data.activity.map((event) => ({
          id: event.id,
          projectId: event.projectId,
          type: event.type as ProjectWorkspacePayload['activity'][number]['type'],
          label: event.label,
          description: event.description,
          happenedAt: new Date(event.happenedAt),
          actorUserId: event.actorUserId,
        })),
      }

      if (data.internal) {
        result.internal = {
          tasks: data.internal.tasks.map(toTask),
          notes: data.internal.notes.map((note) => ({
            id: note.id,
            projectId: note.projectId,
            phaseId: note.phaseId,
            authorId: note.authorId,
            authorName: note.authorName,
            body: note.body,
            parentId: note.parentId,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          })),
          admin: {
            projectLeadId: data.internal.admin.projectLeadId,
            projectLeadName: data.internal.admin.projectLeadName,
            deliveryOwnerId: data.internal.admin.deliveryOwnerId,
            deliveryOwnerName: data.internal.admin.deliveryOwnerName,
            targetLaunchAt: data.internal.admin.targetLaunchAt
              ? new Date(data.internal.admin.targetLaunchAt)
              : null,
            lastUpdatedAt: new Date(data.internal.admin.lastUpdatedAt),
            isDependencyReady: data.internal.admin.isDependencyReady,
          },
        }
      }

      return result
    } catch {
      return null
    }
  }

  async createProject(companyId: string, dto: CreateProjectDTO): Promise<Project> {
    const data = await apiClient.request<{
      id: string
      companyId: string
      name: string
      description: string
      status: string
      createdAt: string
      updatedAt: string
    }>(`/companies/${companyId}/projects`, {
      method: 'POST',
      body: { name: dto.name, description: dto.description },
      companyId,
    })

    return {
      id: data.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      status: data.status as Project['status'],
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }
  }

  async createPhase(projectId: string, dto: CreatePhaseDTO): Promise<ProjectPhaseSummary> {
    const data = await apiClient.request<ApiPhaseSummary>(
      `/projects/${projectId}/phases`,
      {
        method: 'POST',
        body: {
          name: dto.name,
          ...(dto.startsAt !== undefined && { startsAt: dto.startsAt?.toISOString() ?? null }),
          ...(dto.dueAt !== undefined && { dueAt: dto.dueAt?.toISOString() ?? null }),
          ...(dto.milestone !== undefined && { milestone: dto.milestone }),
          ...(dto.isClientVisible !== undefined && { isClientVisible: dto.isClientVisible }),
        },
      },
    )
    return toPhase(data)
  }

  async updatePhase(projectId: string, phaseId: string, dto: UpdatePhaseDTO): Promise<ProjectPhaseSummary> {
    const data = await apiClient.request<ApiPhaseSummary>(
      `/projects/${projectId}/phases/${phaseId}`,
      {
        method: 'PATCH',
        body: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.startsAt !== undefined && { startsAt: dto.startsAt?.toISOString() ?? null }),
          ...(dto.dueAt !== undefined && { dueAt: dto.dueAt?.toISOString() ?? null }),
          ...(dto.milestone !== undefined && { milestone: dto.milestone }),
          ...(dto.blocker !== undefined && { blocker: dto.blocker }),
          ...(dto.isClientVisible !== undefined && { isClientVisible: dto.isClientVisible }),
        },
      },
    )
    return toPhase(data)
  }

  async deletePhase(projectId: string, phaseId: string): Promise<void> {
    await apiClient.request<void>(
      `/projects/${projectId}/phases/${phaseId}`,
      { method: 'DELETE' },
    )
  }

  async reorderPhases(projectId: string, dto: ReorderPhasesDTO): Promise<void> {
    await apiClient.request<void>(
      `/projects/${projectId}/phases/reorder`,
      {
        method: 'PATCH',
        body: { orderedIds: dto.orderedIds },
      },
    )
  }

  async createProjectTask(_companyId: string, _projectId: string, _dto: CreateProjectTaskDTO): Promise<ProjectPendingTaskSummary> {
    throw new Error('createProjectTask: not implemented yet')
  }

  async updateProjectTask(_companyId: string, _projectId: string, _taskId: string, _dto: UpdateProjectTaskDTO): Promise<ProjectPendingTaskSummary> {
    throw new Error('updateProjectTask: not implemented yet')
  }

  async deleteProjectTask(_companyId: string, _projectId: string, _taskId: string): Promise<void> {
    throw new Error('deleteProjectTask: not implemented yet')
  }

  async sendNote(projectId: string, dto: SendNoteDTO): Promise<ProjectNote> {
    const data = await apiClient.request<{
      id: string
      projectId: string
      phaseId: string | null
      authorId: string
      authorName: string
      body: string
      parentId: string | null
      createdAt: string
      updatedAt: string
    }>(`/projects/${projectId}/notes`, {
      method: 'POST',
      body: {
        body: dto.body,
        ...(dto.phaseId !== undefined && { phaseId: dto.phaseId }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    })

    return {
      id: data.id,
      projectId: data.projectId,
      phaseId: data.phaseId,
      authorId: data.authorId,
      authorName: data.authorName,
      body: data.body,
      parentId: data.parentId,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const projectService: ProjectService = new HttpProjectService()
