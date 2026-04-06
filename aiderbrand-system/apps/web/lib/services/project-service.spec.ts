import { apiClient } from '@/lib/api/client'
import { projectService } from '@/lib/services/project-service'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    request: vi.fn(),
  },
}))

describe('projectService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.request).mockReset()
  })

  it('builds a tabular hub payload for internal roles with health signals', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      audience: 'internal',
      summary: {
        totalProjects: 1,
        activeProjects: 1,
        pausedProjects: 0,
        projectsWithOpenTickets: 1,
        projectsAtRisk: 1,
      },
      items: [
        {
          id: 'proj-1',
          companyId: 'comp-1',
          companyName: 'Aiderbrand',
          name: 'Portal de Clientes',
          description: 'Workspace principal',
          status: 'desarrollo',
          currentPhase: 'QA y estabilización',
          progressPct: 62,
          targetLaunchAt: '2026-04-18T09:00:00.000Z',
          updatedAt: '2026-03-28T16:30:00.000Z',
          createdAt: '2026-01-20T09:00:00.000Z',
          ticketCount: 4,
          openTicketCount: 2,
          nextMilestone: 'Suite crítica validada',
          health: 'at-risk',
          phases: [
            {
              id: 'phase-1',
              projectId: 'proj-1',
              name: 'QA y estabilización',
              order: 3,
              status: 'pruebas',
              startsAt: '2026-03-01T09:00:00.000Z',
              dueAt: '2026-04-10T18:00:00.000Z',
              completedAt: null,
              ownerUserId: 'user-3',
              milestone: 'Suite crítica validada',
              blocker: 'Pendiente exportación',
              isClientVisible: true,
            },
          ],
        },
      ],
    })

    const hub = await projectService.getProjectsHub('PROJECT_LEAD', { companyIds: ['comp-1'] })

    expect(apiClient.request).toHaveBeenCalledWith('/projects/hub?companyIds=comp-1')
    expect(hub.audience).toBe('internal')
    expect(hub.summary.projectsAtRisk).toBe(1)
    expect(hub.items).toHaveLength(1)
    expect(hub.items[0]).toEqual(expect.objectContaining({
      health: 'at-risk',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      targetLaunchAt: expect.any(Date),
    }))
    expect(hub.items[0]?.phases[0]).toEqual(expect.objectContaining({
      dueAt: expect.any(Date),
      blocker: 'Pendiente exportación',
    }))
  })

  it('keeps internal sections out of client workspaces', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      audience: 'client',
      project: {
        id: 'proj-1',
        companyId: 'comp-1',
        companyName: 'Aiderbrand',
        name: 'Portal de Clientes',
        description: 'Workspace principal',
        status: 'desarrollo',
        currentPhase: 'QA y estabilización',
        progressPct: 62,
        targetLaunchAt: '2026-04-18T09:00:00.000Z',
        updatedAt: '2026-03-28T16:30:00.000Z',
        createdAt: '2026-01-20T09:00:00.000Z',
      },
      summary: {
        openTickets: 2,
        visiblePhases: 3,
        nextMilestone: 'Suite crítica validada',
        health: null,
      },
      phases: [],
      tasks: [],
      tickets: [
        { id: 'ticket-1', title: 'Exportación CSV', status: 'pendiente', priority: 'alta' },
      ],
      activity: [
        {
          id: 'activity-1',
          projectId: 'proj-1',
          type: 'project',
          label: 'Hito comunicado',
          description: 'Se compartió el avance al cliente.',
          happenedAt: '2026-03-18T16:30:00.000Z',
          actorUserId: 'user-2',
        },
      ],
    })

    const workspace = await projectService.getProjectWorkspace(['comp-1'], 'proj-1', {
      role: 'ACCOUNT_OWNER',
      currentUserId: 'user-1',
    })

    expect(apiClient.request).toHaveBeenCalledWith('/projects/proj-1/workspace')
    expect(workspace).not.toBeNull()
    expect(workspace?.audience).toBe('client')
    expect(workspace?.internal).toBeUndefined()
    expect(workspace?.activity[0]).toEqual(expect.objectContaining({
      type: 'project',
      happenedAt: expect.any(Date),
    }))
  })

  it('shows collaborators only their own pedidos inside the workspace payload', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      audience: 'client',
      project: {
        id: 'proj-3',
        companyId: 'comp-2',
        companyName: 'Acme Solutions',
        name: 'Dashboard Analítico',
        description: 'KPIs en tiempo real',
        status: 'planificacion',
        currentPhase: 'Descubrimiento funcional',
        progressPct: 18,
        targetLaunchAt: '2026-05-16T09:00:00.000Z',
        updatedAt: '2026-03-25T10:00:00.000Z',
        createdAt: '2026-02-15T09:00:00.000Z',
      },
      summary: {
        openTickets: 1,
        visiblePhases: 2,
        nextMilestone: 'Mapa de KPIs y audiencias validado',
        health: null,
      },
      phases: [],
      tasks: [
        {
          id: 'task-analytics-1',
          projectId: 'proj-3',
          phaseId: 'phase-analytics-1',
          title: 'Definir KPIs prioritarios para dirección',
          status: 'en_progreso',
          completionType: null,
          priority: 'alta',
          assigneeUserId: 'user-4',
          dueAt: '2026-03-31T18:00:00.000Z',
          dueState: 'on-track',
          dependencyTaskId: null,
          blockReason: null,
          resolutionNote: null,
          visibleToClient: true,
          checklist: [
            { id: 'task-check-1', label: 'Validar KPIs de ventas', done: true },
          ],
        },
      ],
      tickets: [],
      activity: [],
    })

    const workspace = await projectService.getProjectWorkspace(['comp-2'], 'proj-3', {
      role: 'COLLABORATOR',
      currentUserId: 'user-4',
    })

    expect(workspace).not.toBeNull()
    expect(workspace?.tasks).toHaveLength(1)
    expect(workspace?.tasks[0]?.assigneeUserId).toBe('user-4')
    expect(workspace?.tasks[0]?.visibleToClient).toBe(true)
    expect(workspace?.tasks[0]?.dueAt).toBeInstanceOf(Date)
  })

  it('blocks cross-company workspace access', async () => {
    vi.mocked(apiClient.request).mockRejectedValueOnce(new Error('Forbidden'))

    const workspace = await projectService.getProjectWorkspace(['comp-2'], 'proj-1', {
      role: 'PROJECT_LEAD',
      currentUserId: 'user-2',
    })

    expect(apiClient.request).toHaveBeenCalledWith('/projects/proj-1/workspace')
    expect(workspace).toBeNull()
  })
})
