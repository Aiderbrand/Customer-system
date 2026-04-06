import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { CompanyProjectsSection } from './company-projects-section'
import { projectService } from '@/lib/services/project-service'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock('@/lib/services/project-service', () => ({
  projectService: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
  },
}))

describe('CompanyProjectsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a project from company detail and refreshes the section', async () => {
    const onProjectCreated = vi.fn()

    vi.mocked(projectService.getProjects)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'proj-1',
          companyId: 'comp-1',
          name: 'Portal clientes',
          description: 'Workspace principal',
          status: 'planificacion',
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
          updatedAt: new Date('2026-04-03T12:00:00.000Z'),
          ticketCount: 0,
          openTicketCount: 0,
        },
      ])
    vi.mocked(projectService.createProject).mockResolvedValue({
      id: 'proj-1',
      companyId: 'comp-1',
      name: 'Portal clientes',
      description: 'Workspace principal',
      status: 'planificacion',
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-03T12:00:00.000Z'),
    })

    render(
      <CompanyProjectsSection
        companyId="comp-1"
        companyName="Aiderbrand"
        canCreateProject
        onProjectCreated={onProjectCreated}
      />,
    )

    expect(await screen.findByText('Todavía no hay proyectos en esta company')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Crear primer proyecto' }))
    await user.type(screen.getByLabelText('Nombre'), 'Portal clientes')
    await user.type(screen.getByLabelText('Descripción'), 'Workspace principal')
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }))

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith('comp-1', {
        name: 'Portal clientes',
        description: 'Workspace principal',
      })
    })

    expect(await screen.findByText('Portal clientes')).toBeInTheDocument()
    await waitFor(() => expect(onProjectCreated).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('Proyecto creado', {
      description: 'Portal clientes ya quedó disponible dentro de Aiderbrand.',
    })
  })
})
