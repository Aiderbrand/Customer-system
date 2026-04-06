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
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { DatePicker } from '@/components/forms/date-picker'
import type { ProjectAdminSummary, ProjectCanonicalContext, ProjectPhaseSummary, ProjectStatus } from '@/lib/types'
import { PROJECT_STATUS_OPTIONS } from '@/features/projects/lib/project-selectors'

export interface ProjectEditPayload {
  name: string
  description: string
  status: ProjectStatus
  currentPhase: string | null
  targetLaunchAt: Date | null
}

interface ProjectEditDialogProps {
  open: boolean
  project: ProjectCanonicalContext
  admin: ProjectAdminSummary | null
  phases: ProjectPhaseSummary[]
  onOpenChange: (open: boolean) => void
  onSave: (payload: ProjectEditPayload) => void
}

function formatDateInput(value: Date | null): string {
  if (!value) {
    return ''
  }

  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function ProjectEditDialog({
  open,
  project,
  admin,
  phases,
  onOpenChange,
  onSave,
}: ProjectEditDialogProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [currentPhase, setCurrentPhase] = useState(project.currentPhase ?? '__none__')
  const [targetLaunchAt, setTargetLaunchAt] = useState(formatDateInput(admin?.targetLaunchAt ?? project.targetLaunchAt ?? null))
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setName(project.name)
    setDescription(project.description)
    setStatus(project.status)
    setCurrentPhase(project.currentPhase ?? '__none__')
    setTargetLaunchAt(formatDateInput(admin?.targetLaunchAt ?? project.targetLaunchAt ?? null))
  }, [admin?.targetLaunchAt, open, project])

  const isDirty = useMemo(() => {
    return (
      name !== project.name
      || description !== project.description
      || status !== project.status
      || currentPhase !== (project.currentPhase ?? '__none__')
      || targetLaunchAt !== formatDateInput(admin?.targetLaunchAt ?? project.targetLaunchAt ?? null)
    )
  }, [admin?.targetLaunchAt, currentPhase, description, name, project, status, targetLaunchAt])

  function requestClose() {
    if (!isDirty) {
      onOpenChange(false)
      return
    }

    setConfirmDiscardOpen(true)
  }

  function handleSave() {
    onSave({
      name: name.trim(),
      description: description.trim(),
      status,
      currentPhase: currentPhase === '__none__' ? null : currentPhase,
      targetLaunchAt: targetLaunchAt ? new Date(`${targetLaunchAt}T09:00:00`) : null,
    })
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>
              Actualizá el nombre, el estado, la fase actual y la fecha objetivo del proyecto.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Nombre</Label>
              <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-description">Descripción</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-status">Estado</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
                  <SelectTrigger id="project-status">
                    <SelectValue placeholder="Seleccioná un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PROJECT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-phase">Fase actual</Label>
                <Select value={currentPhase} onValueChange={setCurrentPhase}>
                  <SelectTrigger id="project-phase">
                    <SelectValue placeholder="Seleccioná una fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__none__">Sin definir</SelectItem>
                      {phases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.name}>
                          {phase.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-target-launch">Fecha objetivo</Label>
              <DatePicker
                id="project-target-launch"
                value={targetLaunchAt}
                onChange={setTargetLaunchAt}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={requestClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || !description.trim()}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
