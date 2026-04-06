import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsHub } from '@/features/projects/components/projects-hub'
import { ProjectDetail } from '@/features/projects/components/project-detail'
import { ProjectPhasesSection } from '@/features/projects/components/project-phases-section'
import { getProjectWorkspaceTabs } from '@/features/projects/lib/project-selectors'
import {
  getProjectActivityForAudience,
  getProjectWorkspaceFixture,
  getVisibleProjectPhases,
  getVisibleProjectTasks,
} from '@/lib/mock/project-workspaces'
import type { ProjectHubPayload, ProjectWorkspacePayload, ProjectWorkspaceViewerContext, Role } from '@/lib/types'

vi.mock('@/features/tickets/components/ticket-list-container', () => ({
  TicketListContainer: ({ projectId, mode }: { projectId?: string; mode?: string }) => React.createElement(
    'div',
    { 'data-testid': 'embedded-ticket-list' },
    `tickets:${projectId}:${mode}`,
  ),
}))

function makeHubPayload(): ProjectHubPayload {
  const fixture = getProjectWorkspaceFixture('proj-1')

  if (!fixture) {
    throw new Error('Expected hub fixture for proj-1')
  }

  return {
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
        ...fixture.project,
        ticketCount: 4,
        openTicketCount: 2,
        nextMilestone: 'Suite crítica validada y UAT habilitada',
        health: 'at-risk',
        phases: fixture.phases,
      },
    ],
  }
}

function makeWorkspacePayload(params: {
  projectId: string
  role: Role
  currentUserId: string | null
  audience: 'client' | 'internal'
}): ProjectWorkspacePayload {
  const fixture = getProjectWorkspaceFixture(params.projectId)

  if (!fixture) {
    throw new Error(`Expected workspace fixture for ${params.projectId}`)
  }

  const viewer: ProjectWorkspaceViewerContext = {
    role: params.role,
    currentUserId: params.currentUserId,
  }

  return {
    audience: params.audience,
    project: fixture.project,
    summary: {
      openTickets: params.projectId === 'proj-1' ? 2 : 1,
      visiblePhases: getVisibleProjectPhases(fixture, params.audience).length,
      nextMilestone: fixture.phases.find((phase) => phase.status !== 'completada')?.milestone ?? null,
      health: params.audience === 'internal' ? 'at-risk' : null,
    },
    phases: getVisibleProjectPhases(fixture, params.audience),
    tasks: getVisibleProjectTasks(fixture, viewer),
    tickets: [
      { id: 'ticket-1', title: 'Exportación CSV', status: 'pendiente', priority: 'alta' },
    ],
    activity: getProjectActivityForAudience(fixture, params.audience),
    internal: params.audience === 'internal' ? fixture.internal : undefined,
  }
}

describe('projects runtime evidence', () => {
  it('renders /projects as a tabular hub with workspace and ticket actions', async () => {
    const hub = makeHubPayload()

    render(
        React.createElement(ProjectsHub, {
          summary: hub.summary,
          projects: hub.items,
          audience: hub.audience,
          filters: { companyId: null, search: '', status: [] },
          companyOptions: [{ id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand', createdAt: new Date('2024-01-01') }],
          onCompanyChange: () => {},
          onSearchChange: () => {},
          onToggleStatus: () => {},
          onClearFilters: () => {},
        statusOptions: [],
      }),
    )

    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeInTheDocument()
    expect(screen.getByText('Listado principal')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /proyecto/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /salud/i })).toBeInTheDocument()
    const portalLink = screen.getByRole('link', { name: 'Portal de Clientes' })
    const portalRow = portalLink.closest('tr')

    if (!portalRow) {
      throw new Error('Expected portal row in projects hub table')
    }

    expect(portalLink).toHaveAttribute('href', '/projects/proj-1')
    expect(within(portalRow).getByRole('link', { name: 'Tickets' })).toHaveAttribute('href', '/projects/proj-1?section=tickets')
  })

  it('reuses the embedded tickets module and exposes internal tabs only for internal roles', async () => {
    const internalWorkspace = makeWorkspacePayload({
      projectId: 'proj-1',
      role: 'PROJECT_LEAD',
      currentUserId: 'user-2',
      audience: 'internal',
    })

    render(
      React.createElement(ProjectDetail, {
        workspace: internalWorkspace,
        tabs: getProjectWorkspaceTabs('PROJECT_LEAD'),
        selectedSection: 'tickets',
        canEditProject: true,
        role: 'PROJECT_LEAD',
        currentUserId: 'user-2',
        onOpenProjectEdit: () => {},
        onSectionChange: () => {},

        onAddNote: () => {},
        sectionEmptyState: null,
      }),
    )

    expect(screen.getByRole('tab', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notas del equipo' })).toBeInTheDocument()
    expect(screen.getByTestId('embedded-ticket-list')).toHaveTextContent('tickets:proj-1:embedded')
  })

  it('keeps internal tabs absent for client roles', async () => {
    const clientWorkspace = makeWorkspacePayload({
      projectId: 'proj-1',
      role: 'ACCOUNT_OWNER',
      currentUserId: 'user-1',
      audience: 'client',
    })

    render(
      React.createElement(ProjectDetail, {
        workspace: clientWorkspace,
        tabs: getProjectWorkspaceTabs('ACCOUNT_OWNER'),
        selectedSection: 'plan',
        canEditProject: false,
        role: 'ACCOUNT_OWNER',
        currentUserId: 'user-1',
        onOpenProjectEdit: () => {},
        onSectionChange: () => {},

        onAddNote: () => {},
        sectionEmptyState: null,
      }),
    )

    expect(screen.queryByRole('tab', { name: 'Notas del equipo' })).not.toBeInTheDocument()
  })

  it('shows collaborators only operable phase pedidos and keeps internal context hidden', async () => {
    const user = userEvent.setup()
    const collaboratorWorkspace = makeWorkspacePayload({
      projectId: 'proj-3',
      role: 'COLLABORATOR',
      currentUserId: 'user-4',
      audience: 'client',
    })

    render(
      React.createElement(ProjectPhasesSection, {
        workspace: collaboratorWorkspace,
        role: 'COLLABORATOR',
        currentUserId: 'user-4',

      }),
    )

    expect(screen.getByText('Pedidos visibles')).toBeInTheDocument()
    expect(screen.queryByText(/Bloqueo actual/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument()

    const closedPhaseTrigger = screen.getByRole('button', { name: /2\. Diseño y backlog inicial/i })
    expect(closedPhaseTrigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(closedPhaseTrigger)

    expect(closedPhaseTrigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows internal blocker context and task actions for operational roles', async () => {
    const internalWorkspace = makeWorkspacePayload({
      projectId: 'proj-1',
      role: 'PROJECT_LEAD',
      currentUserId: 'user-3',
      audience: 'internal',
    })

    render(
      React.createElement(ProjectPhasesSection, {
        workspace: internalWorkspace,
        role: 'PROJECT_LEAD',
        currentUserId: 'user-3',

      }),
    )

    expect(screen.getByText(/Bloqueo actual/i)).toBeInTheDocument()
    expect(screen.getByText('Checklist operativo')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Bloquear' }).length).toBeGreaterThan(0)
  })
})
