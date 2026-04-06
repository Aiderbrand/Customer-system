import { act, renderHook, waitFor } from '@testing-library/react'
import { useProjectsHub, useProjectWorkspace } from '@/features/projects/hooks/use-projects'
import type { ProjectHubPayload, ProjectWorkspacePayload } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { companyService } from '@/lib/services/company-service'

const navigationState = {
  pathname: '/projects',
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}

const mockAuth = {
  currentCompany: { id: 'comp-1' },
  effectiveCompanyId: 'comp-1',
  currentRole: 'PROJECT_LEAD',
  currentUser: { id: 'user-2' },
  memberships: [
    {
      companyId: 'comp-1',
      companyName: 'Aiderbrand',
      companySlug: 'aiderbrand',
      role: 'PROJECT_LEAD',
      isActive: true,
    },
  ],
  actorHasSystemAdminCapability: false,
  hasPermission: vi.fn(() => true),
}

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => navigationState.searchParams,
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/lib/services/project-service', () => ({
  projectService: {
    getProjectsHub: vi.fn(),
    getProjectWorkspace: vi.fn(),
    getProjects: vi.fn(),
    getProject: vi.fn(),
  },
}))

vi.mock('@/lib/services/company-service', () => ({
  companyService: {
    getScopedOptions: vi.fn(),
  },
}))

const mockedProjectService = vi.mocked(projectService)
const mockedCompanyService = vi.mocked(companyService)

function makeHubPayload(): ProjectHubPayload {
  return {
    audience: 'internal',
    summary: {
      totalProjects: 2,
      activeProjects: 2,
      pausedProjects: 0,
      projectsWithOpenTickets: 2,
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
        targetLaunchAt: new Date('2026-04-18T09:00:00Z'),
        updatedAt: new Date('2026-03-28T16:30:00Z'),
        createdAt: new Date('2026-01-20T09:00:00Z'),
        ticketCount: 4,
        openTicketCount: 2,
        nextMilestone: 'Suite crítica validada',
        health: 'at-risk',
        phases: [],
      },
      {
        id: 'proj-2',
        companyId: 'comp-1',
        companyName: 'Aiderbrand',
        name: 'Backoffice',
        description: 'Otro proyecto',
        status: 'planificacion',
        currentPhase: 'Discovery',
        progressPct: 10,
        targetLaunchAt: null,
        updatedAt: new Date('2026-03-20T10:00:00Z'),
        createdAt: new Date('2026-03-01T09:00:00Z'),
        ticketCount: 1,
        openTicketCount: 1,
        nextMilestone: 'Kickoff',
        health: null,
        phases: [],
      },
    ],
  }
}

function makeWorkspacePayload(audience: 'client' | 'internal'): ProjectWorkspacePayload {
  return {
    audience,
    project: {
      id: 'proj-1',
      companyId: 'comp-1',
      companyName: 'Aiderbrand',
      name: 'Portal de Clientes',
      description: 'Workspace principal',
      status: 'desarrollo',
      currentPhase: 'QA y estabilización',
      progressPct: 62,
      targetLaunchAt: new Date('2026-04-18T09:00:00Z'),
      updatedAt: new Date('2026-03-28T16:30:00Z'),
      createdAt: new Date('2026-01-20T09:00:00Z'),
    },
    summary: {
      openTickets: 2,
      visiblePhases: 3,
      nextMilestone: 'Suite crítica validada',
      health: audience === 'internal' ? 'at-risk' : null,
    },
    phases: [],
    tasks: [],
    tickets: [
      { id: 'ticket-1', title: 'Exportación CSV', status: 'pendiente', priority: 'alta' },
    ],
    activity: [],
    internal: audience === 'internal'
      ? {
          tasks: [],
          notes: [],
          admin: {
            projectLeadId: 'user-2',
            projectLeadName: null,
            deliveryOwnerId: 'user-3',
            deliveryOwnerName: null,
            targetLaunchAt: new Date('2026-04-18T09:00:00Z'),
            lastUpdatedAt: new Date('2026-03-28T16:30:00Z'),
            isDependencyReady: true,
          },
        }
      : undefined,
  }
}

describe('useProjects hooks', () => {
  beforeEach(() => {
    navigationState.pathname = '/projects'
    navigationState.searchParams = new URLSearchParams()
    navigationState.replace.mockReset()
    mockAuth.currentCompany = { id: 'comp-1' }
    mockAuth.effectiveCompanyId = 'comp-1'
    mockAuth.currentRole = 'PROJECT_LEAD'
    mockAuth.currentUser = { id: 'user-2' }
    mockAuth.memberships = [
      {
        companyId: 'comp-1',
        companyName: 'Aiderbrand',
        companySlug: 'aiderbrand',
        role: 'PROJECT_LEAD',
        isActive: true,
      },
    ]
    mockAuth.actorHasSystemAdminCapability = false
    mockAuth.hasPermission.mockReturnValue(true)
    mockedCompanyService.getScopedOptions.mockReset()
    mockedCompanyService.getScopedOptions.mockResolvedValue([
      {
        id: 'comp-1',
        name: 'Aiderbrand',
        slug: 'aiderbrand',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        isActive: true,
        activeMemberCount: 0,
        pendingInvitationCount: 0,
      },
    ])
    mockedProjectService.getProjectsHub.mockReset()
    mockedProjectService.getProjectWorkspace.mockReset()
  })

  it('loads the projects hub and applies the active search/status filters', async () => {
    navigationState.searchParams = new URLSearchParams('q=portal&status=desarrollo')
    mockedProjectService.getProjectsHub.mockResolvedValue(makeHubPayload())

    const { result } = renderHook(() => useProjectsHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedProjectService.getProjectsHub).toHaveBeenCalledWith('PROJECT_LEAD', {
      companyIds: ['comp-1'],
    })
    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0]?.name).toBe('Portal de Clientes')
    expect(result.current.companyOptions).toEqual([
      expect.objectContaining({ id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand' }),
    ])
    expect(result.current.filters.search).toBe('portal')

    act(() => {
      result.current.clearFilters()
    })

    expect(navigationState.replace).toHaveBeenCalledWith('/projects', { scroll: false })
  })

  it('skips router.replace when search params already match the current url', async () => {
    mockedProjectService.getProjectsHub.mockResolvedValue(makeHubPayload())

    const { result } = renderHook(() => useProjectsHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.clearFilters()
    })

    expect(navigationState.replace).not.toHaveBeenCalled()
  })

  it('fails closed when the local company filter points outside visible scope', async () => {
    navigationState.searchParams = new URLSearchParams('companyId=comp-2')

    const { result } = renderHook(() => useProjectsHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedProjectService.getProjectsHub).not.toHaveBeenCalled()
    expect(result.current.projects).toHaveLength(0)
    expect(result.current.filters.companyId).toBe('comp-2')
  })

  it('normalizes forbidden client sections instead of exposing hidden tabs', async () => {
    navigationState.pathname = '/projects/proj-1'
    navigationState.searchParams = new URLSearchParams('section=team_notes')
    mockAuth.currentRole = 'ACCOUNT_OWNER'
    mockAuth.currentUser = { id: 'user-1' }
    mockedProjectService.getProjectWorkspace.mockResolvedValue(makeWorkspacePayload('client'))

    const { result } = renderHook(() => useProjectWorkspace('proj-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.selectedSection).toBe('plan')
    expect(result.current.tabs.map((tab) => tab.id)).toEqual(['plan', 'tickets', 'activity'])
    expect(navigationState.replace).toHaveBeenCalledWith('/projects/proj-1', { scroll: false })
  })

  it('normalizes legacy phases sections to the canonical workspace default url', async () => {
    navigationState.pathname = '/projects/proj-1'
    navigationState.searchParams = new URLSearchParams('section=phases')
    mockedProjectService.getProjectWorkspace.mockResolvedValue(makeWorkspacePayload('internal'))

    const { result } = renderHook(() => useProjectWorkspace('proj-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.selectedSection).toBe('plan')
    expect(navigationState.replace).toHaveBeenCalledWith('/projects/proj-1', { scroll: false })
  })

  it('keeps internal sections available for internal roles', async () => {
    navigationState.pathname = '/projects/proj-1'
    navigationState.searchParams = new URLSearchParams('section=team_notes')
    mockedProjectService.getProjectWorkspace.mockResolvedValue(makeWorkspacePayload('internal'))

    const { result } = renderHook(() => useProjectWorkspace('proj-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.selectedSection).toBe('team_notes')
    expect(result.current.tabs.map((tab) => tab.id)).toContain('team_notes')
    expect(result.current.workspace?.internal).toBeDefined()
  })

  it('consumes backend-scoped company options instead of deriving them only from memberships', async () => {
    mockedProjectService.getProjectsHub.mockResolvedValue(makeHubPayload())
    mockedCompanyService.getScopedOptions.mockResolvedValue([
      {
        id: 'comp-1',
        name: 'Aiderbrand',
        slug: 'aiderbrand',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        isActive: true,
        activeMemberCount: 0,
        pendingInvitationCount: 0,
      },
      {
        id: 'comp-2',
        name: 'Acme Solutions',
        slug: 'acme',
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        isActive: true,
        activeMemberCount: 0,
        pendingInvitationCount: 0,
      },
    ])

    const { result } = renderHook(() => useProjectsHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.companyOptions.map((company) => company.id)).toEqual(['comp-1', 'comp-2'])
    expect(mockedProjectService.getProjectsHub).toHaveBeenCalledWith('PROJECT_LEAD', {
      companyIds: ['comp-1', 'comp-2'],
    })
  })
})
