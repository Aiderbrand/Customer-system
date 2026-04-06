import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/auth-context'

const refreshMock = vi.fn()
const getSessionMock = vi.fn()
const loginMock = vi.fn()
const startRoleSimulationMock = vi.fn()
const stopRoleSimulationMock = vi.fn()
const setAccessTokenMock = vi.fn()
const setCompanyIdMock = vi.fn()
const clearSessionContextMock = vi.fn()

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    refresh: (...args: unknown[]) => refreshMock(...args),
    getSession: (...args: unknown[]) => getSessionMock(...args),
    startRoleSimulation: (...args: unknown[]) => startRoleSimulationMock(...args),
    stopRoleSimulation: (...args: unknown[]) => stopRoleSimulationMock(...args),
    login: (...args: unknown[]) => loginMock(...args),
    logout: vi.fn(),
    acceptInvitation: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    validateInvitationToken: vi.fn(),
  },
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    setAccessToken: (...args: unknown[]) => setAccessTokenMock(...args),
    setCompanyId: (...args: unknown[]) => setCompanyIdMock(...args),
    clearSessionContext: (...args: unknown[]) => clearSessionContextMock(...args),
  },
}))

function Harness() {
  const {
    status,
    currentCompany,
    currentRole,
    actorGroup,
    effectiveCompanyId,
    simulation,
    startRoleSimulation,
    switchCompany,
    stopRoleSimulation,
    login,
  } = useAuth()

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="company">{currentCompany?.name ?? 'none'}</div>
      <div data-testid="role">{currentRole ?? 'none'}</div>
      <div data-testid="actor-group">{actorGroup ?? 'none'}</div>
      <div data-testid="effective-company-id">{effectiveCompanyId ?? 'none'}</div>
      <div data-testid="simulation">{simulation?.sessionId ?? 'none'}</div>
      <button type="button" onClick={() => void startRoleSimulation('SYSTEM_ADMIN')}>
        start-system-admin
      </button>
      <button type="button" onClick={() => switchCompany('company-2')}>
        switch-company
      </button>
      <button type="button" onClick={() => void stopRoleSimulation()}>
        stop-simulation
      </button>
      <button type="button" onClick={() => void login('admin@example.com', 'Password123!')}>
        login
      </button>
    </div>
  )
}

describe('AuthProvider role simulation', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    getSessionMock.mockReset()
    loginMock.mockReset()
    startRoleSimulationMock.mockReset()
    stopRoleSimulationMock.mockReset()
    setAccessTokenMock.mockReset()
    setCompanyIdMock.mockReset()
    clearSessionContextMock.mockReset()
    window.localStorage.clear()
  })

  it('restores the simulated effective context on refresh and blocks company switching', async () => {
    refreshMock.mockResolvedValue({ accessToken: 'access-token' })
    getSessionMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        createdAt: new Date(),
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Real Company',
          companySlug: 'real-company',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      ],
      actor: { hasSystemAdminCapability: true, scope: { membershipCompanyIds: ['company-1'] } },
      effective: { companyId: null, role: 'PROJECT_LEAD' },
      simulation: {
        sessionId: 'sim-1',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date('2026-03-31T10:00:00.000Z'),
      },
    })

    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    expect(screen.getByTestId('company')).toHaveTextContent('Real Company')
    expect(screen.getByTestId('role')).toHaveTextContent('PROJECT_LEAD')
    expect(screen.getByTestId('actor-group')).toHaveTextContent('internal')
    expect(screen.getByTestId('effective-company-id')).toHaveTextContent('company-1')
    expect(screen.getByTestId('simulation')).toHaveTextContent('sim-1')
    expect(setCompanyIdMock).toHaveBeenCalledWith('company-1')

    await user.click(screen.getByRole('button', { name: 'switch-company' }))

    expect(screen.getByTestId('company')).toHaveTextContent('Real Company')
    expect(setCompanyIdMock).toHaveBeenLastCalledWith('company-1')
  })

  it('stops the active simulation and restores membership-based context', async () => {
    refreshMock.mockResolvedValue({ accessToken: 'access-token' })
    getSessionMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        createdAt: new Date(),
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Real Company',
          companySlug: 'real-company',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      ],
      actor: { hasSystemAdminCapability: true, scope: { membershipCompanyIds: ['company-1'] } },
      effective: { companyId: null, role: 'PROJECT_LEAD' },
      simulation: {
        sessionId: 'sim-1',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date('2026-03-31T10:00:00.000Z'),
      },
    })
    stopRoleSimulationMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        createdAt: new Date(),
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Real Company',
          companySlug: 'real-company',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      ],
      actor: { hasSystemAdminCapability: true, scope: { membershipCompanyIds: ['company-1'] } },
      effective: { companyId: null, role: 'SYSTEM_ADMIN' },
      simulation: null,
    })

    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('simulation')).toHaveTextContent('sim-1')
    })

    await user.click(screen.getByRole('button', { name: 'stop-simulation' }))

    await waitFor(() => {
      expect(screen.getByTestId('simulation')).toHaveTextContent('none')
    })

    expect(stopRoleSimulationMock).toHaveBeenCalledWith('access-token')
    expect(screen.getByTestId('company')).toHaveTextContent('Real Company')
    expect(screen.getByTestId('role')).toHaveTextContent('SYSTEM_ADMIN')
    expect(screen.getByTestId('effective-company-id')).toHaveTextContent('company-1')
  })

  it('treats selecting SYSTEM_ADMIN as a simulation close action', async () => {
    refreshMock.mockResolvedValue({ accessToken: 'access-token' })
    getSessionMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        createdAt: new Date(),
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Real Company',
          companySlug: 'real-company',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      ],
      actor: { hasSystemAdminCapability: true, scope: { membershipCompanyIds: ['company-1'] } },
      effective: { companyId: null, role: 'PROJECT_LEAD' },
      simulation: {
        sessionId: 'sim-1',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date('2026-03-31T10:00:00.000Z'),
      },
    })
    stopRoleSimulationMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        createdAt: new Date(),
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Real Company',
          companySlug: 'real-company',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      ],
      actor: { hasSystemAdminCapability: true, scope: { membershipCompanyIds: ['company-1'] } },
      effective: { companyId: null, role: 'SYSTEM_ADMIN' },
      simulation: null,
    })

    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('simulation')).toHaveTextContent('sim-1')
    })

    await user.click(screen.getByRole('button', { name: 'start-system-admin' }))

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('SYSTEM_ADMIN')
    })

    expect(startRoleSimulationMock).not.toHaveBeenCalled()
    expect(stopRoleSimulationMock).toHaveBeenCalledWith('access-token')
  })

  it('applies the authenticated session returned by login without relying on a global company selector', async () => {
    refreshMock.mockRejectedValue(new Error('no refresh session'))
    loginMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        createdAt: new Date(),
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Real Company',
          companySlug: 'real-company',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      ],
      actor: { hasSystemAdminCapability: true, scope: { membershipCompanyIds: ['company-1'] } },
      effective: { companyId: null, role: 'SYSTEM_ADMIN' },
      simulation: null,
    })

    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })

    await user.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    expect(loginMock).toHaveBeenCalledWith('admin@example.com', 'Password123!')
    expect(screen.getByTestId('company')).toHaveTextContent('Real Company')
    expect(screen.getByTestId('role')).toHaveTextContent('SYSTEM_ADMIN')
    expect(screen.getByTestId('effective-company-id')).toHaveTextContent('company-1')
    expect(setCompanyIdMock).toHaveBeenLastCalledWith('company-1')
  })
})
