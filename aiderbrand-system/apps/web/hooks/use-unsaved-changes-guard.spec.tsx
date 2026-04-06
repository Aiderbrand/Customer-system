import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

function GuardHarness({ enabled }: { enabled: boolean }) {
  const { confirmationOpen, confirmNavigation, cancelNavigation } = useUnsavedChangesGuard({ enabled })

  return (
    <div>
      <a href="/projects/proj-1">Ir al proyecto</a>

      {confirmationOpen ? (
        <div>
          <button type="button" onClick={confirmNavigation}>
            Confirmar salida
          </button>
          <button type="button" onClick={cancelNavigation}>
            Seguir editando
          </button>
        </div>
      ) : null}
    </div>
  )
}

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('intercepts internal link navigation while the form is dirty', async () => {
    const user = userEvent.setup()

    render(<GuardHarness enabled />)

    await user.click(screen.getByRole('link', { name: 'Ir al proyecto' }))

    expect(pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirmar salida' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(pushMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('link', { name: 'Ir al proyecto' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar salida' }))

    expect(pushMock).toHaveBeenCalledWith('/projects/proj-1')
  })
})
