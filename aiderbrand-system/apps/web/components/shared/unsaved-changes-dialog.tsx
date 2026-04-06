import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnsavedChangesDialogProps {
  open: boolean
  onConfirm: () => void   // proceed anyway (discard changes)
  onCancel: () => void    // go back to editing
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * UnsavedChangesDialog — confirmation dialog shown when the user tries to
 * navigate away or dismiss a form with unsaved content.
 * Per AGENTS.md: "notificacion de perdida de avance al clickear afuera de un modal"
 */
export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Cambios sin guardar</DialogTitle>
          <DialogDescription>
            Tenés cambios sin guardar. ¿Seguro que querés salir? Se perderá el
            contenido que escribiste.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Seguir editando
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Descartar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
