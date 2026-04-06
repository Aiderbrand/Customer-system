import { render, screen } from '@testing-library/react'
import { AppShell } from '@/components/layout/app-shell'

vi.mock('@/components/layout/app-sidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">sidebar</aside>,
}))

vi.mock('@/components/layout/app-header', () => ({
  AppHeader: () => <header data-testid="app-header">header</header>,
}))

describe('AppShell', () => {
  it('keeps the header inside the inset shell without forcing viewport overflow', () => {
    render(
      <AppShell>
        <div data-testid="page-content">contenido</div>
      </AppShell>,
    )

    const shellWrapper = screen.getByTestId('app-sidebar').parentElement
    const inset = screen.getByRole('main')
    const pageContent = screen.getByTestId('page-content')
    const contentWrapper = pageContent.parentElement

    expect(shellWrapper).toHaveClass('min-w-0')
    expect(shellWrapper).toHaveClass('max-w-full')
    expect(shellWrapper).toHaveClass('overflow-x-clip')
    expect(inset).toHaveClass('min-w-0')
    expect(inset).toHaveClass('max-w-full')
    expect(inset).toHaveClass('overflow-x-hidden')
    expect(contentWrapper).toHaveClass('min-w-0')
    expect(contentWrapper).toHaveClass('w-full')
    expect(contentWrapper).toHaveClass('max-w-full')
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
  })
})
