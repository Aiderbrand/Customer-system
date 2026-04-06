'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import type { ProjectPendingTaskSummary, ProjectPhaseSummary } from '@/lib/types'

export type ProjectTaskActionMode = 'block' | 'not_applicable' | 'dependency' | 'done'

export interface ProjectTaskActionPayload {
  mode: ProjectTaskActionMode
  reason?: string
  dependencyTitle?: string
  dependencyPhaseId?: string | null
  dependencyMode?: 'request' | 'create'
}

interface ProjectTaskActionDialogProps {
  open: boolean
  mode: ProjectTaskActionMode | null
  task: ProjectPendingTaskSummary | null
  phases: ProjectPhaseSummary[]
  onOpenChange: (open: boolean) => void
  onSubmit: (taskId: string, payload: ProjectTaskActionPayload) => void
}

export function ProjectTaskActionDialog({
  open,
  mode,
  task,
  phases,
  onOpenChange,
  onSubmit,
}: ProjectTaskActionDialogProps) {
  const [reason, setReason] = useState('')
  const [dependencyTitle, setDependencyTitle] = useState('')
  const [dependencyPhaseId, setDependencyPhaseId] = useState<string>('__same__')
  const [dependencyMode, setDependencyMode] = useState<'request' | 'create'>('request')

  useEffect(() => {
    if (!open || !task || !mode) {
      return
    }

    setReason(task.blockReason ?? task.resolutionNote ?? '')
    setDependencyTitle(task.dependencyTaskId ? `Seguimiento para ${task.title}` : '')
    setDependencyPhaseId(task.phaseId ?? '__same__')
    setDependencyMode('request')
  }, [mode, open, task])

  const copy = useMemo(() => {
    switch (mode) {
      case 'block':
        return {
          title: 'Bloquear tarea',
          description: 'Dejá el motivo operativo para que quede claro qué impide avanzar.',
          primaryLabel: 'Guardar bloqueo',
        }
      case 'not_applicable':
        return {
          title: 'Marcar no corresponde',
          description: 'Registrá el motivo para cerrar la tarea sin marcarla como terminada funcionalmente.',
          primaryLabel: 'Guardar criterio',
        }
      case 'dependency':
        return {
          title: 'Gestionar dependencia',
          description: 'Podés solicitar una dependencia al owner o crearla directamente como tarea nueva.',
          primaryLabel: 'Confirmar dependencia',
        }
      default:
        return null
    }
  }, [mode])

  if (!task || !mode || !copy) {
    return null
  }

  const currentTask = task
  const currentMode = mode

  function handleSubmit() {
    if (currentMode === 'dependency') {
      if (!dependencyTitle.trim()) {
        return
      }

      onSubmit(currentTask.id, {
        mode: currentMode,
        dependencyMode,
        dependencyTitle: dependencyTitle.trim(),
        dependencyPhaseId: dependencyPhaseId === '__same__' ? currentTask.phaseId : dependencyPhaseId,
      })
      onOpenChange(false)
      return
    }

    if (!reason.trim()) {
      return
    }

    onSubmit(currentTask.id, {
      mode: currentMode,
      reason: reason.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {currentTask.title}
          </div>

          {currentMode === 'dependency' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dependency-mode">Tipo de acción</Label>
                <Select value={dependencyMode} onValueChange={(value) => setDependencyMode(value as 'request' | 'create')}>
                  <SelectTrigger id="dependency-mode">
                    <SelectValue placeholder="Seleccioná una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="request">Solicitar dependencia</SelectItem>
                      <SelectItem value="create">Crear dependencia</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dependency-title">Título</Label>
                <Input
                  id="dependency-title"
                  value={dependencyTitle}
                  onChange={(event) => setDependencyTitle(event.target.value)}
                  placeholder="Ej. Validar respuesta del proveedor"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dependency-phase">Fase</Label>
                <Select value={dependencyPhaseId} onValueChange={setDependencyPhaseId}>
                  <SelectTrigger id="dependency-phase">
                    <SelectValue placeholder="Seleccioná una fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__same__">Mantener la fase actual</SelectItem>
                      {phases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id}>
                          {phase.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-reason">Motivo</Label>
              <Textarea
                id="task-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Contá qué pasó para que el resto del equipo tenga contexto."
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>{copy.primaryLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
