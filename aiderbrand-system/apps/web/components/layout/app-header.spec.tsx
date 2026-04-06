import { render, screen } from '@testing-library/react'
import { SidebarProvider } from '@workspace/ui/components/sidebar'
import { AppHeader } from '@/components/layout/app-header'

const useAuthMock = vi.fn()

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/components/layout/breadcrumb-nav', () => ({
  BreadcrumbNav: () => <nav data-testid="breadcrumb-nav">breadcrumb</nav>,
}))

describe('AppHeader', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      actorHasSystemAdminCapability: true,
      currentRole: 'PROJECT_LEAD',
      actorGroup: 'internal',
      simulation: {
        sessionId: 'sim-1',
        effectiveRole: 'PROJECT_LEAD',
        startedAt: new Date('2026-04-04T10:00:00.000Z'),
      },
      startRoleSimulation: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders the active simulation banner inside the sticky header with shrinking guards', () => {
    render(
      <SidebarProvider>
        <AppHeader />
      </SidebarProvider>,
    )

    const header = screen.getByRole('banner')
    const bannerTitle = screen.getByText('Simulación activa')
    const banner = bannerTitle.closest('[role="alert"]')

    expect(header).toHaveClass('min-w-0')
    expect(header).toHaveClass('max-w-full')
    expect(header).toHaveClass('overflow-x-clip')
    expect(screen.getByText(/Operando como/i)).toBeInTheDocument()
    expect(banner).toHaveClass('min-w-0')
    expect(banner).toHaveClass('overflow-hidden')
    expect(screen.getByTestId('breadcrumb-nav')).toBeInTheDocument()
  })
})
