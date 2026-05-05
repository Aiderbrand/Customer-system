'use client'

import { useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import type { ProjectPhaseSummary } from '@/lib/types'
import { toInputDate } from './project-phases-shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhaseFormValues {
  name: string
  milestone: string
  startsAt: string
  dueAt: string
  isClientVisible: boolean
}

export function emptyPhaseForm(): PhaseFormValues {
  return { name: '', milestone: '', startsAt: '', dueAt: '', isClientVisible: true }
}

export function formFromPhase(phase: ProjectPhaseSummary): PhaseFormValues {
  return {
    name: phase.name,
    milestone: phase.milestone ?? '',
    startsAt: phase.startsAt ? toInputDate(phase.startsAt) : '',
    dueAt: phase.dueAt ? toInputDate(phase.dueAt) : '',
    isClientVisible: phase.isClientVisible,
  }
}

export interface PhaseFormDialogProps {
  open: boolean
  phase: ProjectPhaseSummary | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PhaseFormValues) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhaseFormDialog({ open, phase, submitting, onOpenChange, onSubmit }: PhaseFormDialogProps) {
  const isEdit = Boolean(phase)
  const [form, setForm] = useState<PhaseFormValues>(phase ? formFromPhase(phase) : emptyPhaseForm())

  function handleOpenChange(next: boolean) {
    if (!submitting) {
      onOpenChange(next)
      if (!next) setForm(phase ? formFromPhase(phase) : emptyPhaseForm())
    }
  }

  function handleOpen(isOpen: boolean) {
    if (isOpen) setForm(phase ? formFromPhase(phase) : emptyPhaseForm())
    handleOpenChange(isOpen)
  }

  function set<K extends keyof PhaseFormValues>(key: K, value: PhaseFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar fase' : 'Nueva fase'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modificá los datos de esta fase del proyecto.'
              : 'Agregá una nueva fase al plan del proyecto.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phase-name">Nombre *</Label>
            <Input
              id="phase-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Diseño UI"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phase-milestone">Hito</Label>
            <Input
              id="phase-milestone"
              value={form.milestone}
              onChange={(e) => set('milestone', e.target.value)}
              placeholder="Ej: Entrega beta al cliente"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phase-starts-at">Inicio</Label>
              <Input
                id="phase-starts-at"
                type="date"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phase-due-at">Vencimiento</Label>
              <Input
                id="phase-due-at"
                type="date"
                value={form.dueAt}
                onChange={(e) => set('dueAt', e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="phase-client-visible"
              type="checkbox"
              checked={form.isClientVisible}
              onChange={(e) => set('isClientVisible', e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="phase-client-visible" className="cursor-pointer font-normal">
              Visible para el cliente
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={submitting || !form.name.trim()}>
            {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar fase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
