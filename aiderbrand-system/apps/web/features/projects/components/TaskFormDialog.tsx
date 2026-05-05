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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import type { Priority } from '@/lib/types'
import { PRIORITY_OPTIONS } from './project-phases-shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormValues {
  title: string
  priority: Priority
  dueAt: string
}

export function emptyTaskForm(): TaskFormValues {
  return { title: '', priority: 'media', dueAt: '' }
}

export interface TaskFormDialogProps {
  open: boolean
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TaskFormValues) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormDialog({ open, submitting, onOpenChange, onSubmit }: TaskFormDialogProps) {
  const [form, setForm] = useState<TaskFormValues>(emptyTaskForm())

  function handleOpenChange(next: boolean) {
    if (!submitting) {
      onOpenChange(next)
      if (!next) setForm(emptyTaskForm())
    }
  }

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Agregá una tarea a esta fase.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ej: Crear wireframes"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Prioridad</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => set('priority', v as Priority)}
                disabled={submitting}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due-at">Vencimiento</Label>
              <Input
                id="task-due-at"
                type="date"
                value={form.dueAt}
                onChange={(e) => set('dueAt', e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={submitting || !form.title.trim()}>
            {submitting ? 'Guardando...' : 'Agregar tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
