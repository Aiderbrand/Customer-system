'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Layers,
  LayoutList,
  Pencil,
  Plus,
  Target,
  Trash2,
  User,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@workspace/ui/components/collapsible'
import type {
  CreatePhaseDTO,
  CreateProjectTaskDTO,
  PhaseStatus,
  ProjectPendingTaskSummary,
  ProjectPhaseSummary,
  ProjectWorkspacePayload,
  Role,
  TaskStatus,
  UpdatePhaseDTO,
  UpdateProjectTaskDTO,
} from '@/lib/types'
import {
  canManageProjectTasks,
  getNotesForPhase,
  getProjectTaskAudienceLabel,
  getTasksForPhase,
  getVisibleWorkspaceTasks,
} from '@/features/projects/lib/project-selectors'
import {
  PHASE_STATUS_CONFIG,
  formatCompact,
  formatFull,
} from './project-phases-shared'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { PhaseFormDialog } from './PhaseFormDialog'
import { PhaseKanban } from './PhaseKanban'
import { PhaseListView } from './PhaseListView'
import { PhaseStatusSelector } from './PhaseStatusSelector'
import { TaskDetailSheet } from './TaskDetailSheet'
import { TaskFormDialog } from './TaskFormDialog'
import type { PhaseFormValues } from './PhaseFormDialog'
import type { TaskFormValues } from './TaskFormDialog'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhaseActions {
  create: (dto: CreatePhaseDTO) => Promise<void>
  update: (id: string, dto: UpdatePhaseDTO) => Promise<void>
  delete: (id: string) => Promise<void>
  reorder: (orderedIds: string[]) => Promise<void>
}

export interface TaskActions {
  create: (dto: CreateProjectTaskDTO) => Promise<void>
  update: (id: string, dto: UpdateProjectTaskDTO) => Promise<void>
  delete: (id: string) => Promise<void>
}

interface ProjectPhasesSectionProps {
  workspace: ProjectWorkspacePayload
  role: Role
  currentUserId: string | null
  phaseActions?: PhaseActions
  taskActions?: TaskActions
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function ProjectPhasesSection({
  workspace,
  role,
  currentUserId,
  phaseActions,
  taskActions,
}: ProjectPhasesSectionProps) {
  const [phaseFormDialog, setPhaseFormDialog] = useState<{ open: boolean; phase: ProjectPhaseSummary | null }>({
    open: false,
    phase: null,
  })
  const [deletePhaseDialog, setDeletePhaseDialog] = useState<{ open: boolean; phase: ProjectPhaseSummary | null }>({
    open: false,
    phase: null,
  })
  const [taskFormDialog, setTaskFormDialog] = useState<{ open: boolean; phaseId: string | null }>({
    open: false,
    phaseId: null,
  })
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{ open: boolean; task: ProjectPendingTaskSummary | null }>({
    open: false,
    task: null,
  })
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [listViewPhases, setListViewPhases] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  function toggleListView(phaseId: string) {
    setListViewPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  const canManage = canManageProjectTasks(role) && Boolean(phaseActions)
  const canManageTasks = canManageProjectTasks(role) && Boolean(taskActions)
  const visibleTasks = useMemo(() => getVisibleWorkspaceTasks(workspace), [workspace])
  const selectedTask = useMemo(
    () => visibleTasks.find((t) => t.id === selectedTaskId) ?? null,
    [selectedTaskId, visibleTasks],
  )
  const taskLabel = getProjectTaskAudienceLabel(role)
  const showInternalNotes = canManageProjectTasks(role)

  async function handlePhaseFormSubmit(values: PhaseFormValues) {
    if (!phaseActions) return
    setSubmitting(true)
    try {
      if (phaseFormDialog.phase) {
        await phaseActions.update(phaseFormDialog.phase.id, {
          name: values.name.trim(),
          milestone: values.milestone.trim() || null,
          startsAt: values.startsAt ? new Date(values.startsAt) : null,
          dueAt: values.dueAt ? new Date(values.dueAt) : null,
          isClientVisible: values.isClientVisible,
        })
      } else {
        await phaseActions.create({
          name: values.name.trim(),
          milestone: values.milestone.trim() || null,
          startsAt: values.startsAt ? new Date(values.startsAt) : null,
          dueAt: values.dueAt ? new Date(values.dueAt) : null,
          isClientVisible: values.isClientVisible,
        })
      }
      setPhaseFormDialog({ open: false, phase: null })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeletePhaseConfirm() {
    if (!phaseActions || !deletePhaseDialog.phase) return
    setSubmitting(true)
    try {
      await phaseActions.delete(deletePhaseDialog.phase.id)
      setDeletePhaseDialog({ open: false, phase: null })
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePhaseStatusChange(phase: ProjectPhaseSummary, status: PhaseStatus) {
    if (!phaseActions) return
    await phaseActions.update(phase.id, { status })
  }

  async function handleTaskFormSubmit(values: TaskFormValues) {
    if (!taskActions || !taskFormDialog.phaseId) return
    setSubmitting(true)
    try {
      await taskActions.create({
        title: values.title.trim(),
        priority: values.priority,
        phaseId: taskFormDialog.phaseId,
        dueAt: values.dueAt ? new Date(values.dueAt) : null,
      })
      setTaskFormDialog({ open: false, phaseId: null })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTaskStatusChange(task: ProjectPendingTaskSummary, status: TaskStatus) {
    if (!taskActions) return
    await taskActions.update(task.id, { status })
  }

  async function handleDeleteTaskConfirm() {
    if (!taskActions || !deleteTaskDialog.task) return
    setSubmitting(true)
    try {
      await taskActions.delete(deleteTaskDialog.task.id)
      setDeleteTaskDialog({ open: false, task: null })
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
    <div className="flex flex-col gap-2">
      {workspace.phases.length === 0 && !canManage && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Este proyecto no tiene fases configuradas.
        </p>
      )}

      {workspace.phases.map((phase, index) => {
        const phaseTasks = getTasksForPhase(visibleTasks, phase.id)
        const phaseNotes = showInternalNotes
          ? getNotesForPhase(workspace.internal?.notes ?? [], phase.id)
          : []
        const isReordering = reorderingId === phase.id
        const cfg = PHASE_STATUS_CONFIG[phase.status]
        const isCurrentPhase = workspace.project.currentPhase === phase.name
        const completedTasks = phaseTasks.filter((t) => t.status === 'completada').length

        return (
          <Collapsible
            key={phase.id}
            defaultOpen={index === 0 || isCurrentPhase}
            className="group"
          >
            <div
              className={[
                'rounded-lg border border-l-4 bg-card',
                cfg.border,
                isCurrentPhase ? 'shadow-sm ring-1 ring-inset ring-border/60' : '',
              ].join(' ')}
            >
              {/* ── Header ── */}
              <div className="flex items-stretch">
                <CollapsibleTrigger asChild>
                  <button className="flex flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-lg">
                    <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground/60">
                      {String(phase.order).padStart(2, '0')}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold leading-tight text-foreground">
                          {phase.name}
                        </span>

                        {/* Status — clickable when can manage, static otherwise */}
                        {canManage ? (
                          <PhaseStatusSelector
                            phase={phase}
                            onStatusChange={handlePhaseStatusChange}
                          />
                        ) : (
                          <span
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                              cfg.badge,
                            ].join(' ')}
                          >
                            <span className={['h-1.5 w-1.5 rounded-full', cfg.dot].join(' ')} />
                            {cfg.label}
                          </span>
                        )}

                        {!phase.isClientVisible && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                            <EyeOff className="h-3 w-3" />
                            Solo interno
                          </span>
                        )}

                        {phaseTasks.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {completedTasks}/{phaseTasks.length}{' '}
                            {taskLabel === 'Pedido' ? 'pedidos' : 'tareas'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {phase.milestone && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3 shrink-0" />
                            {phase.milestone}
                          </span>
                        )}
                        {(phase.startsAt ?? phase.dueAt) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {phase.startsAt && phase.dueAt
                              ? `${formatCompact(phase.startsAt)} – ${formatCompact(phase.dueAt)}`
                              : phase.startsAt
                                ? `Desde ${formatCompact(phase.startsAt)}`
                                : `Vence ${formatCompact(phase.dueAt!)}`}
                          </span>
                        )}
                        {phase.ownerName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 shrink-0" />
                            {phase.ownerName}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>

                {/* Manage actions */}
                {canManage && (
                  <div className="flex shrink-0 items-center gap-0 border-l px-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                      disabled={index === 0 || isReordering}
                      onClick={() => handleReorder(phase, 'up')}
                      title="Mover arriba"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                      disabled={index === workspace.phases.length - 1 || isReordering}
                      onClick={() => handleReorder(phase, 'down')}
                      title="Mover abajo"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                      onClick={() => setPhaseFormDialog({ open: true, phase })}
                      title="Editar fase"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                      onClick={() => setDeletePhaseDialog({ open: true, phase })}
                      title="Eliminar fase"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Expanded content ── */}
              <CollapsibleContent>
                <div className="border-t">
                  {/* Blocker */}
                  {phase.blocker && showInternalNotes && (
                    <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span>{phase.blocker}</span>
                    </div>
                  )}

                  {/* Kanban/list board */}
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {taskLabel === 'Pedido' ? 'Pedidos' : 'Tareas'}
                        </span>
                        <button
                          onClick={() => toggleListView(phase.id)}
                          title={listViewPhases.has(phase.id) ? 'Ver kanban' : 'Ver lista'}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {listViewPhases.has(phase.id) ? (
                            <Layers className="h-3.5 w-3.5" />
                          ) : (
                            <LayoutList className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {canManageTasks && (
                        <button
                          onClick={() => setTaskFormDialog({ open: true, phaseId: phase.id })}
                          className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nueva tarea
                        </button>
                      )}
                    </div>

                    {phaseTasks.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Sin tareas cargadas.</p>
                    ) : listViewPhases.has(phase.id) ? (
                      <PhaseListView
                        tasks={phaseTasks}
                        canManage={canManageTasks}
                        onTaskClick={(t) => setSelectedTaskId(t.id)}
                        onStatusChange={handleTaskStatusChange}
                        onDelete={(task) => setDeleteTaskDialog({ open: true, task })}
                      />
                    ) : (
                      <PhaseKanban
                        tasks={phaseTasks}
                        canManage={canManageTasks}
                        onStatusChange={handleTaskStatusChange}
                        onTaskClick={(t) => setSelectedTaskId(t.id)}
                        onDelete={(task) => setDeleteTaskDialog({ open: true, task })}
                      />
                    )}
                  </div>

                  {/* Notes */}
                  {phaseNotes.length > 0 && (
                    <div className="flex flex-col gap-2 border-t px-4 pb-4 pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Notas
                      </p>
                      {phaseNotes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-md border-l-2 border-muted bg-muted/20 py-2 pl-3 pr-3"
                        >
                          <p className="text-sm leading-relaxed text-foreground">{note.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatFull(note.updatedAt, true)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      {canManage && (
        <button
          onClick={() => setPhaseFormDialog({ open: true, phase: null })}
          className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          Agregar fase
        </button>
      )}

      <PhaseFormDialog
        open={phaseFormDialog.open}
        phase={phaseFormDialog.phase}
        submitting={submitting}
        onOpenChange={(open) => setPhaseFormDialog({ open, phase: phaseFormDialog.phase })}
        onSubmit={handlePhaseFormSubmit}
      />

      <DeleteConfirmDialog
        open={deletePhaseDialog.open}
        name={deletePhaseDialog.phase?.name ?? ''}
        submitting={submitting}
        onCancel={() => setDeletePhaseDialog({ open: false, phase: null })}
        onConfirm={handleDeletePhaseConfirm}
      />

      {taskFormDialog.phaseId && (
        <TaskFormDialog
          open={taskFormDialog.open}
          submitting={submitting}
          onOpenChange={(open) => setTaskFormDialog({ open, phaseId: taskFormDialog.phaseId })}
          onSubmit={handleTaskFormSubmit}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTaskDialog.open}
        name={deleteTaskDialog.task?.title ?? ''}
        submitting={submitting}
        onCancel={() => setDeleteTaskDialog({ open: false, task: null })}
        onConfirm={handleDeleteTaskConfirm}
      />

      <TaskDetailSheet
        task={selectedTask}
        phases={workspace.phases}
        canManage={canManageTasks}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null) }}
        onUpdate={async (id, dto) => {
          if (!taskActions) return
          await taskActions.update(id, dto)
        }}
        onDelete={(task) => {
          setSelectedTaskId(null)
          setDeleteTaskDialog({ open: true, task })
        }}
      />
    </div>
  )
}
