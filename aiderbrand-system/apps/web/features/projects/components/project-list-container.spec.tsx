import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ProjectListContainer } from './project-list-container'
import { useProjectsHub } from '@/features/projects/hooks/use-projects'
import { projectService } from '@/lib/services/project-service'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock('@/features/projects/hooks/use-projects', () => ({
  useProjectsHub: vi.fn(),
}))

vi.mock('@/lib/services/project-service', () => ({
  projectService: {
    createProject: vi.fn(),
  },
}))

describe('ProjectListContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    push.mockReset()
  })

  it('creates a project from the hub and redirects to the new workspace', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useProjectsHub).mockReturnValue({
      hub: {
        audience: 'internal',
        summary: {
          totalProjects: 0,
          activeProjects: 0,
          pausedProjects: 0,
          projectsWithOpenTickets: 0,
          projectsAtRisk: 0,
        },
        items: [],
      },
      projects: [],
      loading: false,
      error: null,
      refetch,
      filters: { companyId: 'comp-2', search: '', status: [] },
      companyOptions: [
        { id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand', createdAt: new Date('2026-01-01T00:00:00.000Z') },
        { id: 'comp-2', name: 'Acme Solutions', slug: 'acme', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      ],
      setCompanyId: vi.fn(),
      setSearch: vi.fn(),
      toggleStatus: vi.fn(),
      clearFilters: vi.fn(),
      emptyState: {
        title: 'Todavía no hay proyectos en esta cuenta',
        description: 'Aún no hay proyectos visibles.',
        canReset: false,
      },
      statusOptions: [],
      canCreateProject: true,
    })

    vi.mocked(projectService.createProject).mockResolvedValue({
      id: 'proj-9',
      companyId: 'comp-2',
      name: 'Portal B2B',
      description: 'Workspace inicial',
      status: 'planificacion',
      createdAt: new Date('2026-04-05T10:00:00.000Z'),
      updatedAt: new Date('2026-04-05T10:00:00.000Z'),
    })

    render(<ProjectListContainer />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Nuevo proyecto' }))

    const createButton = screen.getByRole('button', { name: 'Crear proyecto' })
    await user.type(screen.getByLabelText('Nombre'), 'Portal B2B')
    await user.type(screen.getByLabelText('Descripción'), 'Workspace inicial')
    await user.click(createButton)

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith('comp-2', {
        name: 'Portal B2B',
        description: 'Workspace inicial',
      })
    })

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('Proyecto creado', {
      description: 'El workspace inicial ya quedó disponible para seguir operando.',
    })
    expect(push).toHaveBeenCalledWith('/projects/proj-9')
  })
})
