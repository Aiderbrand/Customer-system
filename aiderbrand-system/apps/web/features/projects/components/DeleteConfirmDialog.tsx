'use client'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeleteConfirmDialogProps {
  open: boolean
  name: string
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteConfirmDialog({ open, name, submitting, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) onCancel() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar</DialogTitle>
          <DialogDescription>
            ¿Seguro que querés eliminar{' '}
            <span className="font-medium text-foreground">{name}</span>?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
