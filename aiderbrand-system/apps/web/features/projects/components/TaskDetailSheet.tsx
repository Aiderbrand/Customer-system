'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Paperclip,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Separator } from '@workspace/ui/components/separator'
import type {
  Priority,
  ProjectPendingTaskSummary,
  ProjectPhaseSummary,
  TaskStatus,
  UpdateProjectTaskDTO,
} from '@/lib/types'
import { PROJECT_TASK_PRIORITY_LABELS } from '@/features/projects/lib/project-selectors'
import {
  PRIORITY_COLOR,
  PRIORITY_OPTIONS,
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER,
  formatCompact,
  toInputDate,
} from './project-phases-shared'

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskDetailSheet({
  task,
  phases,
  canManage,
  onOpenChange,
  onUpdate,
  onDelete,
}: {
  task: ProjectPendingTaskSummary | null
  phases: ProjectPhaseSummary[]
  canManage: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, dto: UpdateProjectTaskDTO) => Promise<void>
  onDelete: (task: ProjectPendingTaskSummary) => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  async function save(field: string, dto: UpdateProjectTaskDTO) {
    if (!task) return
    setSaving(field)
    try {
      await onUpdate(task.id, dto)
    } finally {
      setSaving(null)
    }
  }

  const statusCfg = task ? TASK_STATUS_CONFIG[task.status] : null
  const done = task?.status === 'completada'

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-[420px]" onPointerDownOutside={(e) => e.preventDefault()}>
        {task && statusCfg && (
          <>
            <SheetHeader className="shrink-0 pb-3">
              <div className="flex items-start gap-2 pr-6">
                <span className={['mt-0.5 shrink-0', statusCfg.color].join(' ')}>{statusCfg.icon}</span>
                <SheetTitle className={['text-base leading-snug', done ? 'line-through text-muted-foreground' : ''].join(' ')}>
                  {task.title}
                </SheetTitle>
              </div>
              <SheetDescription className="sr-only">Detalle de la tarea</SheetDescription>
            </SheetHeader>

            <Separator className="shrink-0" />

            <div className="flex-1 overflow-y-auto">
              {/* ── Fields ── */}
              <div className="flex flex-col gap-0 divide-y divide-border/50">
                {/* Status */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">Estado</span>
                  {canManage ? (
                    <Select value={task.status} onValueChange={(v) => save('status', { status: v as TaskStatus })} disabled={saving === 'status'}>
                      <SelectTrigger className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0 hover:bg-muted/50 rounded-md px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUS_ORDER.map((s) => {
                          const cfg = TASK_STATUS_CONFIG[s]
                          return (
                            <SelectItem key={s} value={s}>
                              <div className="flex items-center gap-2"><span className={cfg.color}>{cfg.icon}</span>{cfg.label}</div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-sm"><span className={statusCfg.color}>{statusCfg.icon}</span>{statusCfg.label}</div>
                  )}
                </div>

                {/* Priority */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">Prioridad</span>
                  {canManage ? (
                    <Select value={task.priority} onValueChange={(v) => save('priority', { priority: v as Priority })} disabled={saving === 'priority'}>
                      <SelectTrigger className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0 hover:bg-muted/50 rounded-md px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={['text-sm font-medium', PRIORITY_COLOR[task.priority]].join(' ')}>
                      {PROJECT_TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  )}
                </div>

                {/* Phase */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">Fase</span>
                  {canManage ? (
                    <Select value={task.phaseId ?? '__none__'} onValueChange={(v) => save('phase', { phaseId: v === '__none__' ? null : v })} disabled={saving === 'phase'}>
                      <SelectTrigger className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0 hover:bg-muted/50 rounded-md px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin fase</SelectItem>
                        {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{phases.find((p) => p.id === task.phaseId)?.name ?? 'Sin fase'}</span>
                  )}
                </div>

                {/* Due date */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">Vencimiento</span>
                  {canManage ? (
                    <Input
                      type="date"
                      className="h-7 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0 hover:bg-muted/50 rounded-md"
                      key={task.id}
                      defaultValue={task.dueAt ? toInputDate(task.dueAt) : ''}
                      onBlur={(e) => save('dueAt', { dueAt: e.target.value ? new Date(e.target.value) : null })}
                      disabled={saving === 'dueAt'}
                    />
                  ) : task.dueAt ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatCompact(task.dueAt)}
                      {task.dueState === 'breached' && <span className="text-xs font-medium text-destructive">Vencida</span>}
                      {task.dueState === 'at-risk' && <span className="text-xs font-medium text-amber-600">En riesgo</span>}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin fecha</span>
                  )}
                </div>

                {/* Assignee */}
                {task.assigneeName && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Responsable</span>
                    <span className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {task.assigneeName}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Checklist ── */}
              {task.checklist.length > 0 && (
                <div className="px-4 py-3 border-t">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Checklist — {task.checklist.filter((i) => i.done).length}/{task.checklist.length} completados
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {task.checklist.map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <input type="checkbox" id={item.id} checked={item.done} readOnly className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                        <label htmlFor={item.id} className={['text-sm leading-snug', item.done ? 'line-through text-muted-foreground' : ''].join(' ')}>
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Notas ── */}
              <div className="border-t px-4 py-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Notas internas</p>
                {task.blockReason ? (
                  <div className="mb-2 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    <span>{task.blockReason}</span>
                  </div>
                ) : null}
                {task.resolutionNote ? (
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{task.resolutionNote}</span>
                  </div>
                ) : null}
                {!task.blockReason && !task.resolutionNote && (
                  <p className="text-sm text-muted-foreground/50">Sin notas registradas.</p>
                )}
              </div>

              {/* ── Archivos ── */}
              <div className="border-t px-4 py-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Archivos adjuntos</p>
                <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground/50">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span>Adjunto de archivos disponible próximamente.</span>
                </div>
              </div>

              {/* ── Dependencias ── */}
              {task.dependencyTaskId && (
                <div className="border-t px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Dependencia</p>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Depende de otra tarea
                  </div>
                </div>
              )}
            </div>

            {canManage && (
              <div className="shrink-0 border-t pt-3 flex justify-end px-4 pb-2">
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(task)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar tarea
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
