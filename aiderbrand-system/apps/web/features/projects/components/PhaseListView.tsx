'use client'

import { Calendar, MoreHorizontal, Trash2, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import type { ProjectPendingTaskSummary, TaskStatus } from '@/lib/types'
import { PROJECT_TASK_PRIORITY_LABELS } from '@/features/projects/lib/project-selectors'
import {
  PRIORITY_COLOR,
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER,
  formatCompact,
} from './project-phases-shared'

// ─── Phase list view ──────────────────────────────────────────────────────────

export function PhaseListView({
  tasks,
  canManage,
  onTaskClick,
  onStatusChange,
  onDelete,
}: {
  tasks: ProjectPendingTaskSummary[]
  canManage: boolean
  onTaskClick: (task: ProjectPendingTaskSummary) => void
  onStatusChange: (task: ProjectPendingTaskSummary, status: TaskStatus) => Promise<void>
  onDelete: (task: ProjectPendingTaskSummary) => void
}) {
  return (
    <div className="flex flex-col divide-y divide-border/50 rounded-md border">
      {tasks.map((task) => {
        const statusCfg = TASK_STATUS_CONFIG[task.status]
        const done = task.status === 'completada'
        return (
          <div
            key={task.id}
            className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/30 cursor-pointer"
            onClick={() => onTaskClick(task)}
          >
            <span className={['shrink-0', statusCfg.color].join(' ')}>{statusCfg.icon}</span>
            <span className={['flex-1 min-w-0 truncate', done ? 'line-through text-muted-foreground' : 'text-foreground'].join(' ')}>
              {task.title}
            </span>
            <span className={['shrink-0 text-xs', PRIORITY_COLOR[task.priority]].join(' ')}>
              {PROJECT_TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {task.dueAt && (
              <span className="shrink-0 flex items-center gap-0.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatCompact(task.dueAt)}
              </span>
            )}
            {task.assigneeName && (
              <span className="shrink-0 flex items-center gap-0.5 text-xs text-muted-foreground max-w-[5rem] truncate">
                <User className="h-3 w-3 shrink-0" />
                {task.assigneeName.split(' ')[0]}
              </span>
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[150px]">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Mover a</p>
                  {TASK_STATUS_ORDER.filter((s) => s !== task.status).map((status) => {
                    const cfg = TASK_STATUS_CONFIG[status]
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={(e) => { e.stopPropagation(); onStatusChange(task, status) }}
                        className="flex items-center gap-2"
                      >
                        <span className={cfg.color}>{cfg.icon}</span>
                        {cfg.label}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(task) }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}
    </div>
  )
}
