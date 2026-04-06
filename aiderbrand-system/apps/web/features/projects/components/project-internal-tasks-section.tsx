'use client'

import { useMemo } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import type { ProjectPendingTaskSummary, ProjectWorkspacePayload, Role } from '@/lib/types'
import {
  getProjectTaskDisplayStatus,
  getProjectTaskSummary,
  getTasksForPhase,
  PROJECT_TASK_DUE_STATE_LABELS,
  PROJECT_TASK_PRIORITY_LABELS,
} from '@/features/projects/lib/project-selectors'

interface ProjectInternalTasksSectionProps {
  workspace: ProjectWorkspacePayload
  role: Role
  currentUserId: string | null
}

export function ProjectInternalTasksSection({
  workspace,
  role,
  currentUserId,
}: ProjectInternalTasksSectionProps) {
  const summary = useMemo(() => getProjectTaskSummary(workspace.tasks), [workspace.tasks])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tareas abiertas" value={String(summary.total)} />
        <MetricCard label="Bloqueadas" value={String(summary.blocked)} />
        <MetricCard label="Con responsable" value={String(summary.own)} />
        <MetricCard label="Resueltas" value={String(summary.completed)} />
      </div>

      <div className="flex flex-col gap-4">
        {workspace.phases.map((phase) => {
          const tasks = getTasksForPhase(workspace.tasks, phase.id)

          if (tasks.length === 0) {
            return null
          }

          return (
            <Card key={phase.id}>
              <CardHeader>
                <CardTitle className="text-base">{phase.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Checklist</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{task.title}</span>
                            {task.dependencyTaskId && (
                              <span className="text-xs text-muted-foreground">Depende de una tarea vinculada</span>
                            )}
                            {task.blockReason && (
                              <span className="text-xs text-muted-foreground">Motivo: {task.blockReason}</span>
                            )}
                            {task.resolutionNote && task.status === 'completada' && (
                              <span className="text-xs text-muted-foreground">Cierre: {task.resolutionNote}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {task.checklist.map((item) => (
                              <span key={item.id} className="text-xs text-muted-foreground">
                                {item.done ? '•' : '○'} {item.label}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{task.assigneeName ?? 'Sin asignar'}</TableCell>
                        <TableCell>{PROJECT_TASK_PRIORITY_LABELS[task.priority]}</TableCell>
                        <TableCell>{task.dueAt ? formatDate(task.dueAt) : 'Sin fecha'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline">{getProjectTaskDisplayStatus(task)}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {PROJECT_TASK_DUE_STATE_LABELS[task.dueState]}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>

    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold text-foreground">{value}</span>
      </CardContent>
    </Card>
  )
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
}
