'use client'

import { useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  User,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
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
  KANBAN_COLUMNS,
  PRIORITY_COLOR,
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER,
  formatCompact,
} from './project-phases-shared'

// ─── Phase kanban with DnD ────────────────────────────────────────────────────

export function PhaseKanban({
  tasks,
  canManage,
  onStatusChange,
  onTaskClick,
  onDelete,
}: {
  tasks: ProjectPendingTaskSummary[]
  canManage: boolean
  onStatusChange: (task: ProjectPendingTaskSummary, status: TaskStatus) => Promise<void>
  onTaskClick: (task: ProjectPendingTaskSummary) => void
  onDelete: (task: ProjectPendingTaskSummary) => void
}) {
  const [activeTask, setActiveTask] = useState<ProjectPendingTaskSummary | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    const newStatus = over.id as TaskStatus
    if (newStatus === task.status) return
    onStatusChange(task, newStatus)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status)
          return (
            <DroppableKanbanColumn
              key={col.status}
              column={col}
              tasks={columnTasks}
              canManage={canManage}
              isDragging={Boolean(activeTask)}
              onStatusChange={onStatusChange}
              onTaskClick={onTaskClick}
              onDelete={onDelete}
            />
          )
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            canManage={false}
            isOverlay
            onStatusChange={onStatusChange}
            onTaskClick={onTaskClick}
            onDelete={onDelete}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableKanbanColumn({
  column,
  tasks,
  canManage,
  isDragging,
  onStatusChange,
  onTaskClick,
  onDelete,
}: {
  column: (typeof KANBAN_COLUMNS)[number]
  tasks: ProjectPendingTaskSummary[]
  canManage: boolean
  isDragging: boolean
  onStatusChange: (task: ProjectPendingTaskSummary, status: TaskStatus) => Promise<void>
  onTaskClick: (task: ProjectPendingTaskSummary) => void
  onDelete: (task: ProjectPendingTaskSummary) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })
  const statusCfg = TASK_STATUS_CONFIG[column.status]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 pb-1">
        <span className={statusCfg.color}>{statusCfg.icon}</span>
        <span className={['text-xs font-medium', column.headerColor].join(' ')}>{column.label}</span>
        {tasks.length > 0 && (
          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex min-h-[3rem] flex-col gap-1.5 rounded-md p-1 transition-colors',
          isDragging && isOver ? 'bg-muted/60 ring-1 ring-border' : isDragging ? 'bg-muted/20' : '',
        ].join(' ')}
      >
        {tasks.map((task) => (
          <DraggableKanbanCard
            key={task.id}
            task={task}
            canManage={canManage}
            onStatusChange={onStatusChange}
            onTaskClick={onTaskClick}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Draggable card wrapper ───────────────────────────────────────────────────

function DraggableKanbanCard({
  task,
  canManage,
  onStatusChange,
  onTaskClick,
  onDelete,
}: {
  task: ProjectPendingTaskSummary
  canManage: boolean
  onStatusChange: (task: ProjectPendingTaskSummary, status: TaskStatus) => Promise<void>
  onTaskClick: (task: ProjectPendingTaskSummary) => void
  onDelete: (task: ProjectPendingTaskSummary) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    touchAction: 'none',
  } as const

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        task={task}
        canManage={canManage}
        isDragging={isDragging}
        onStatusChange={onStatusChange}
        onTaskClick={onTaskClick}
        onDelete={onDelete}
      />
    </div>
  )
}

// ─── Kanban card ──────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  canManage,
  isDragging,
  isOverlay,
  onStatusChange,
  onTaskClick,
  onDelete,
}: {
  task: ProjectPendingTaskSummary
  canManage: boolean
  isDragging?: boolean
  isOverlay?: boolean
  onStatusChange: (task: ProjectPendingTaskSummary, status: TaskStatus) => Promise<void>
  onTaskClick: (task: ProjectPendingTaskSummary) => void
  onDelete: (task: ProjectPendingTaskSummary) => void
}) {
  const done = task.status === 'completada'

  return (
    <div
      className={[
        'group/card select-none rounded-md border p-2 text-xs',
        done ? 'bg-muted/20 opacity-60' : 'bg-card hover:bg-muted/20',
        canManage && !isDragging ? 'cursor-grab active:cursor-grabbing' : '',
        isOverlay ? 'shadow-lg ring-1 ring-primary/20 rotate-1 cursor-grabbing' : '',
      ].join(' ')}
      onClick={(e) => {
        if (isDragging) return
        onTaskClick(task)
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={['flex-1 leading-snug', done ? 'line-through text-muted-foreground' : 'text-foreground'].join(' ')}>
          {task.title}
        </span>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover/card:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              >
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

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
        <span className={PRIORITY_COLOR[task.priority]}>
          {PROJECT_TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {task.dueAt && (
          <span className="flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {formatCompact(task.dueAt)}
          </span>
        )}
        {task.assigneeName && (
          <span className="flex items-center gap-0.5">
            <User className="h-2.5 w-2.5" />
            {task.assigneeName.split(' ')[0]}
          </span>
        )}
        {task.checklist.length > 0 && (
          <span className="flex items-center gap-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {task.checklist.filter((i) => i.done).length}/{task.checklist.length}
          </span>
        )}
      </div>

      {task.blockReason && (
        <p className="mt-1 truncate text-destructive">{task.blockReason}</p>
      )}
    </div>
  )
}
