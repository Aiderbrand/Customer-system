import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { CompanyDetailPayload } from '@/lib/types'
import { CompanyDetailPage } from './company-detail-page'
import { companyService } from '@/lib/services/company-service'
import { projectService } from '@/lib/services/project-service'

const mockHasPermission = vi.fn<(permission: string) => boolean>()

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    currentRole: 'PROJECT_LEAD',
    hasPermission: mockHasPermission,
  }),
}))

vi.mock('@/lib/services/company-service', () => ({
  companyService: {
    getCompanyDetail: vi.fn(),
    updateCompany: vi.fn(),
    createInvitation: vi.fn(),
    updateCompanyStatus: vi.fn(),
    updateMembershipStatus: vi.fn(),
    updateMembershipRole: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}))

vi.mock('@/lib/services/project-service', () => ({
  projectService: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock('@/features/companies/components/company-dialogs', () => ({
  CompanyFormDialog: ({ open }: { open: boolean }) => React.createElement('div', { 'data-testid': 'company-form-dialog', 'data-open': open }),
  InviteMemberDialog: ({ open }: { open: boolean }) => React.createElement('div', { 'data-testid': 'invite-member-dialog', 'data-open': open }),
  MembershipRoleDialog: ({ open }: { open: boolean }) => React.createElement('div', { 'data-testid': 'membership-role-dialog', 'data-open': open }),
  CompanyConfirmDialog: ({ open, title }: { open: boolean; title: string }) => React.createElement('div', { 'data-testid': 'company-confirm-dialog', 'data-open': open, 'data-title': title }),
}))

function createDetailPayload(): CompanyDetailPayload {
  return {
    company: {
      id: 'comp-1',
      name: 'Aiderbrand',
      slug: 'aiderbrand',
      isActive: true,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-03T12:00:00.000Z'),
      activeMemberCount: 2,
      pendingInvitationCount: 1,
    },
    members: [
      {
        userId: 'user-1',
        companyId: 'comp-1',
        role: 'PROJECT_LEAD',
        isActive: true,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-03T10:00:00.000Z'),
        user: {
          id: 'user-1',
          email: 'lead@example.com',
          name: 'Lead User',
          avatarUrl: null,
        },
      },
      {
        userId: 'user-2',
        companyId: 'comp-1',
        role: 'COLLABORATOR',
        isActive: false,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-04T10:00:00.000Z'),
        user: {
          id: 'user-2',
          email: 'collab@example.com',
          name: 'Collab User',
          avatarUrl: null,
        },
      },
    ],
    invitations: [
      {
        id: 'inv-1',
        companyId: 'comp-1',
        email: 'pending@example.com',
        role: 'DELIVERY_SPECIALIST',
        status: 'PENDING',
        expiresAt: new Date('2026-04-10T10:00:00.000Z'),
        createdById: 'user-1',
        acceptedAt: null,
        revokedAt: null,
        createdAt: new Date('2026-04-03T09:00:00.000Z'),
      },
    ],
    projects: [],
    activity: [
      {
        id: 'act-1',
        action: 'INVITATION_CREATED',
        entityType: 'INVITATION',
        entityId: 'inv-1',
        actorId: 'user-1',
        createdAt: new Date('2026-04-03T09:05:00.000Z'),
        metadata: null,
      },
    ],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('CompanyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectService.getProjects).mockResolvedValue([])
  })

  it('renders a loading skeleton before the detail resolves', () => {
    const pending = deferred<CompanyDetailPayload>()
    vi.mocked(companyService.getCompanyDetail).mockReturnValueOnce(pending.promise)
    mockHasPermission.mockReturnValue(true)

    render(<CompanyDetailPage companyId="comp-1" />)

    expect(screen.getByTestId('company-detail-loading')).toBeInTheDocument()
  })

  it('renders the error state when the detail request fails', async () => {
    vi.mocked(companyService.getCompanyDetail).mockRejectedValueOnce(new Error('Boom'))
    mockHasPermission.mockReturnValue(true)

    render(<CompanyDetailPage companyId="comp-1" />)

    expect(await screen.findByText('No pudimos cargar esta company')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('renders the professional overview with one primary CTA and a real projects section', async () => {
    vi.mocked(companyService.getCompanyDetail).mockResolvedValueOnce(createDetailPayload())
    vi.mocked(projectService.getProjects).mockResolvedValueOnce([
      {
        id: 'proj-1',
        companyId: 'comp-1',
        name: 'Portal clientes',
        description: 'Workspace principal',
        status: 'desarrollo',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-03T12:00:00.000Z'),
        ticketCount: 4,
        openTicketCount: 2,
      },
    ])
    mockHasPermission.mockImplementation((permission) => (
      [
        'companies:invite',
        'companies:update',
        'companies:create-project',
        'companies:memberships:update',
        'companies:status',
        'companies:activity:view',
      ] as string[]
    ).includes(permission))

    render(<CompanyDetailPage companyId="comp-1" />)

    expect(await screen.findByRole('heading', { name: 'Aiderbrand' })).toBeInTheDocument()
    expect(screen.getByTestId('company-primary-cta')).toHaveTextContent('Invite member')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status: deactivate' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(await screen.findByText('Portal clientes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo proyecto' })).toBeInTheDocument()
    expect(screen.getByTestId('active-members-desktop-table')).toBeInTheDocument()
    expect(screen.getByTestId('active-members-mobile-list')).toBeInTheDocument()
    expect(screen.getByTestId('invitations-desktop-table')).toBeInTheDocument()
    expect(screen.getByTestId('invitations-mobile-list')).toBeInTheDocument()
  })

  it('hides restricted actions and activity for users without those permissions', async () => {
    vi.mocked(companyService.getCompanyDetail).mockResolvedValueOnce(createDetailPayload())
    vi.mocked(projectService.getProjects).mockResolvedValueOnce([])
    mockHasPermission.mockReturnValue(false)

    render(<CompanyDetailPage companyId="comp-1" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Aiderbrand' })).toBeInTheDocument()
    })

    expect(screen.queryByTestId('company-primary-cta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Status: deactivate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Activity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo proyecto' })).not.toBeInTheDocument()
    expect(screen.getByText('Todavía no hay proyectos en esta company')).toBeInTheDocument()
  })
})
