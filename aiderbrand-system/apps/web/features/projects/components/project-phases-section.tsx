'use client'

import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@workspace/ui/components/collapsible'
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
import { Separator } from '@workspace/ui/components/separator'
import type {
  CreatePhaseDTO,
  ProjectPendingTaskSummary,
  ProjectPhaseSummary,
  ProjectWorkspacePayload,
  Role,
  UpdatePhaseDTO,
} from '@/lib/types'
import {
  canManageProjectTasks,
  getNotesForPhase,
  getProjectTaskAudienceLabel,
  getProjectTaskDisplayStatus,
  getTasksForPhase,
  getVisibleWorkspaceTasks,
  PROJECT_TASK_DUE_STATE_LABELS,
  PROJECT_TASK_PRIORITY_LABELS,
} from '@/features/projects/lib/project-selectors'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhaseActions {
  create: (dto: CreatePhaseDTO) => Promise<void>
  update: (id: string, dto: UpdatePhaseDTO) => Promise<void>
  delete: (id: string) => Promise<void>
  reorder: (orderedIds: string[]) => Promise<void>
}

interface ProjectPhasesSectionProps {
  workspace: ProjectWorkspacePayload
  role: Role
  currentUserId: string | null
  phaseActions?: PhaseActions
}

// ─── Phase form dialog ────────────────────────────────────────────────────────

interface PhaseFormValues {
  name: string
  milestone: string
  startsAt: string
  dueAt: string
  isClientVisible: boolean
}

function emptyForm(): PhaseFormValues {
  return { name: '', milestone: '', startsAt: '', dueAt: '', isClientVisible: true }
}

function formFromPhase(phase: ProjectPhaseSummary): PhaseFormValues {
  return {
    name: phase.name,
    milestone: phase.milestone ?? '',
    startsAt: phase.startsAt ? toInputDate(phase.startsAt) : '',
    dueAt: phase.dueAt ? toInputDate(phase.dueAt) : '',
    isClientVisible: phase.isClientVisible,
  }
}

function toInputDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

interface PhaseFormDialogProps {
  open: boolean
  phase: ProjectPhaseSummary | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PhaseFormValues) => void
}

function PhaseFormDialog({ open, phase, submitting, onOpenChange, onSubmit }: PhaseFormDialogProps) {
  const isEdit = Boolean(phase)
  const [form, setForm] = useState<PhaseFormValues>(phase ? formFromPhase(phase) : emptyForm())

  function handleOpenChange(next: boolean) {
    if (!submitting) {
      onOpenChange(next)
      if (!next) setForm(phase ? formFromPhase(phase) : emptyForm())
    }
  }

  function handleOpen(open: boolean) {
    if (open) setForm(phase ? formFromPhase(phase) : emptyForm())
    handleOpenChange(open)
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
          <Button
            onClick={() => onSubmit(form)}
            disabled={submitting || !form.name.trim()}
          >
            {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar fase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  open: boolean
  phaseName: string
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ open, phaseName, submitting, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) onCancel() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar fase</DialogTitle>
          <DialogDescription>
            ¿Seguro que querés eliminar <span className="font-medium text-foreground">{phaseName}</span>?
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

// ─── Main section ─────────────────────────────────────────────────────────────

export function ProjectPhasesSection({
  workspace,
  role,
  currentUserId,
  phaseActions,
}: ProjectPhasesSectionProps) {
  const [formDialog, setFormDialog] = useState<{
    open: boolean
    phase: ProjectPhaseSummary | null
  }>({ open: false, phase: null })

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    phase: ProjectPhaseSummary | null
  }>({ open: false, phase: null })

  const [submitting, setSubmitting] = useState(false)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const canManage = canManageProjectTasks(role) && Boolean(phaseActions)
  const visibleTasks = useMemo(
    () => getVisibleWorkspaceTasks(workspace),
    [workspace],
  )
  const taskLabel = getProjectTaskAudienceLabel(role)
  const showInternalNotes = canManageProjectTasks(role)

  async function handleFormSubmit(values: PhaseFormValues) {
    if (!phaseActions) return
    setSubmitting(true)
    try {
      if (formDialog.phase) {
        const dto: UpdatePhaseDTO = {
          name: values.name.trim(),
          milestone: values.milestone.trim() || null,
          startsAt: values.startsAt ? new Date(values.startsAt) : null,
          dueAt: values.dueAt ? new Date(values.dueAt) : null,
          isClientVisible: values.isClientVisible,
        }
        await phaseActions.update(formDialog.phase.id, dto)
      } else {
        const dto: CreatePhaseDTO = {
          name: values.name.trim(),
          milestone: values.milestone.trim() || null,
          startsAt: values.startsAt ? new Date(values.startsAt) : null,
          dueAt: values.dueAt ? new Date(values.dueAt) : null,
          isClientVisible: values.isClientVisible,
        }
        await phaseActions.create(dto)
      }
      setFormDialog({ open: false, phase: null })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!phaseActions || !deleteDialog.phase) return
    setSubmitting(true)
    try {
      await phaseActions.delete(deleteDialog.phase.id)
      setDeleteDialog({ open: false, phase: null })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReorder(phase: ProjectPhaseSummary, direction: 'up' | 'down') {
    if (!phaseActions) return
    const phases = workspace.phases
    const index = phases.findIndex((p) => p.id === phase.id)
    if (index < 0) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === phases.length - 1) return

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const ordered = phases.map((p) => p.id)
    const temp = ordered[index]!
    ordered[index] = ordered[swapIndex]!
    ordered[swapIndex] = temp

    setReorderingId(phase.id)
    try {
      await phaseActions.reorder(ordered)
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {workspace.phases.length === 0 && !canManage && (
        <p className="text-sm text-muted-foreground">
          Este proyecto no tiene fases configuradas.
        </p>
      )}

      {workspace.phases.map((phase, index) => {
        const phaseTasks = getTasksForPhase(visibleTasks, phase.id)
        const phaseNotes = showInternalNotes ? getNotesForPhase(workspace.internal?.notes ?? [], phase.id) : []
        const isReordering = reorderingId === phase.id

        return (
          <Collapsible
            key={phase.id}
            defaultOpen={index === 0 || workspace.project.currentPhase === phase.name}
          >
            <Card>
              <CardHeader className="p-0">
                <div className="flex items-center gap-1 pr-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto flex-1 justify-between rounded-xl px-4 py-4 text-left"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-foreground">
                            {phase.order}. {phase.name}
                          </span>
                          <Badge variant="outline">{phase.status}</Badge>
                          {phaseTasks.length > 0 && (
                            <Badge variant="secondary">
                              {phaseTasks.length} {taskLabel.toLowerCase()}{phaseTasks.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {phaseNotes.length > 0 && <Badge variant="outline">{phaseNotes.length} notas</Badge>}
                          {!phase.isClientVisible && (
                            <Badge variant="secondary">Solo interno</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Hito: {phase.milestone ?? 'Sin hito definido'}
                        </span>
                      </div>
                      <ChevronDown className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>

                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0 || isReordering}
                        onClick={() => handleReorder(phase, 'up')}
                        title="Mover arriba"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === workspace.phases.length - 1 || isReordering}
                        onClick={() => handleReorder(phase, 'down')}
                        title="Mover abajo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFormDialog({ open: true, phase })}
                        title="Editar fase"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, phase })}
                        title="Eliminar fase"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
                  <Separator />

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <InlineInfoRow label="Inicio" value={phase.startsAt ? formatDate(phase.startsAt) : 'Sin fecha'} />
                    <InlineInfoRow label="Vencimiento" value={phase.dueAt ? formatDate(phase.dueAt) : 'Sin fecha'} />
                    <InlineInfoRow label="Responsable" value={phase.ownerName ?? 'Sin asignar'} />
                  </div>

                  {phase.blocker && showInternalNotes && (
                    <div className="rounded-xl border bg-muted/20 px-3 py-3 text-sm text-foreground">
                      <span className="font-medium">Bloqueo actual:</span> {phase.blocker}
                    </div>
                  )}

                  {phaseTasks.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {taskLabel === 'Pedido' ? 'Pedidos visibles' : 'Checklist operativo'}
                        </h3>
                      </div>

                      <div className="grid gap-3">
                        {phaseTasks.map((task) => (
                          <div key={task.id} className="rounded-xl border px-3 py-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-foreground">{task.title}</span>
                                  <Badge variant="outline">{getProjectTaskDisplayStatus(task)}</Badge>
                                  <Badge variant="secondary">{PROJECT_TASK_PRIORITY_LABELS[task.priority]}</Badge>
                                </div>

                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  <span>Responsable: {task.assigneeName ?? 'Sin asignar'}</span>
                                  <span>{PROJECT_TASK_DUE_STATE_LABELS[task.dueState]}</span>
                                  <span>{task.dueAt ? `Vence ${formatDate(task.dueAt)}` : 'Sin fecha'}</span>
                                </div>

                                {task.dependencyTaskId && (
                                  <p className="text-sm text-muted-foreground">Tiene una dependencia asociada.</p>
                                )}

                                {task.blockReason && (
                                  <p className="text-sm text-muted-foreground">Motivo: {task.blockReason}</p>
                                )}

                                {task.checklist.length > 0 && role !== 'ACCOUNT_OWNER' && role !== 'COLLABORATOR' && (
                                  <div className="flex flex-col gap-1">
                                    {task.checklist.map((item) => (
                                      <span key={item.id} className="text-xs text-muted-foreground">
                                        {item.done ? '•' : '○'} {item.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {phaseNotes.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-foreground">Notas de la fase</h3>
                      {phaseNotes.map((note) => (
                        <div key={note.id} className="rounded-xl border px-3 py-3">
                          <p className="text-sm leading-6 text-foreground">{note.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">Actualizada {formatDate(note.updatedAt, true)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}

      {canManage && (
        <Button
          variant="outline"
          className="mt-1 w-full"
          onClick={() => setFormDialog({ open: true, phase: null })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar fase
        </Button>
      )}


      <PhaseFormDialog
        open={formDialog.open}
        phase={formDialog.phase}
        submitting={submitting}
        onOpenChange={(open) => setFormDialog({ open, phase: formDialog.phase })}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        phaseName={deleteDialog.phase?.name ?? ''}
        submitting={submitting}
        onCancel={() => setDeleteDialog({ open: false, phase: null })}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function InlineInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function formatDate(value: Date, withTime = false): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(value)
}
