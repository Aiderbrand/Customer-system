import { fireEvent, render, screen } from '@testing-library/react'
import { TicketFilters } from '@/features/tickets/components/ticket-filters'
import type { TicketFilterState } from '@/features/tickets/types'

describe('TicketFilters', () => {
  const baseFilters: TicketFilterState = {
    companyId: undefined,
    status: [],
    priority: [],
    projectId: undefined,
    search: 'login',
  }

  it('keeps the search input controlled when parent filters change', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TicketFilters filters={baseFilters} onChange={onChange} />)

    const searchInput = screen.getByPlaceholderText('Buscar tickets...')
    expect(searchInput).toHaveValue('login')

    rerender(<TicketFilters filters={{ ...baseFilters, search: '' }} onChange={onChange} />)
    expect(searchInput).toHaveValue('')
  })

  it('debounces search updates without desfasar el valor visible', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()

    render(<TicketFilters filters={{ ...baseFilters, search: '' }} onChange={onChange} />)

    const searchInput = screen.getByPlaceholderText('Buscar tickets...')
    fireEvent.change(searchInput, { target: { value: 'sla' } })

    expect(searchInput).toHaveValue('sla')
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)

    expect(onChange).toHaveBeenLastCalledWith({
      status: [],
      priority: [],
      assignedToId: undefined,
      companyId: undefined,
      projectId: undefined,
      search: 'sla',
    })

    vi.useRealTimers()
  })

  it('shows the local company filter only when the page asks for it', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <TicketFilters
        filters={baseFilters}
        onChange={onChange}
        showCompanyFilter
        companies={[
          { id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand', createdAt: new Date('2024-01-01') },
          { id: 'comp-2', name: 'Acme Solutions', slug: 'acme', createdAt: new Date('2024-02-01') },
        ]}
      />,
    )

    expect(screen.getByText('Todas las companies')).toBeInTheDocument()

    rerender(<TicketFilters filters={baseFilters} onChange={onChange} />)

    expect(screen.queryByText('Todas las companies')).not.toBeInTheDocument()
  })

  it('allows the filter controls row to wrap instead of forcing horizontal overflow', () => {
    const onChange = vi.fn()
    const { container } = render(
      <TicketFilters
        filters={baseFilters}
        onChange={onChange}
        showCompanyFilter
        showProjectFilter
        companies={[
          { id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand', createdAt: new Date('2024-01-01') },
          { id: 'comp-2', name: 'Acme Solutions', slug: 'acme', createdAt: new Date('2024-02-01') },
        ]}
        projects={[
          { id: 'proj-1', name: 'Portal de Clientes' },
          { id: 'proj-2', name: 'Campus Mobile' },
        ]}
      />,
    )

    const controlsRow = container.firstElementChild?.firstElementChild

    expect(controlsRow).toHaveClass('min-w-0')
    expect(controlsRow).toHaveClass('sm:flex-wrap')
  })
})
