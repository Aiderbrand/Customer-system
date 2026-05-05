import type { ReactNode } from 'react'
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import type { PhaseStatus, Priority, TaskStatus } from '@/lib/types'
import {
  PHASE_STATUS_CONFIG as _PHASE_STATUS_BASE,
  TASK_STATUS_CONFIG as _TASK_STATUS_BASE,
} from '@/lib/status-configs'

// ─── Phase status config ──────────────────────────────────────────────────────

export const PHASE_STATUS_CONFIG: Record<
  PhaseStatus,
  { label: string; border: string; badge: string; dot: string }
> = {
  planificacion: { ..._PHASE_STATUS_BASE.planificacion, border: 'border-l-slate-400' },
  desarrollo:    { ..._PHASE_STATUS_BASE.desarrollo,    border: 'border-l-blue-500' },
  pruebas:       { ..._PHASE_STATUS_BASE.pruebas,       border: 'border-l-violet-500' },
  revision:      { ..._PHASE_STATUS_BASE.revision,      border: 'border-l-amber-500' },
  produccion:    { ..._PHASE_STATUS_BASE.produccion,    border: 'border-l-green-500' },
  completada:    { ..._PHASE_STATUS_BASE.completada,    border: 'border-l-emerald-500' },
}

export const PHASE_STATUS_ORDER: PhaseStatus[] = [
  'planificacion', 'desarrollo', 'pruebas', 'revision', 'produccion', 'completada',
]

// ─── Task status config ───────────────────────────────────────────────────────

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; icon: ReactNode; color: string }> = {
  pendiente:   { ..._TASK_STATUS_BASE.pendiente,   icon: <Circle className="h-3.5 w-3.5" />,       color: 'text-muted-foreground/60' },
  en_progreso: { ..._TASK_STATUS_BASE.en_progreso, icon: <Clock className="h-3.5 w-3.5" />,         color: 'text-blue-500' },
  bloqueada:   { ..._TASK_STATUS_BASE.bloqueada,   icon: <XCircle className="h-3.5 w-3.5" />,       color: 'text-destructive' },
  completada:  { ..._TASK_STATUS_BASE.completada,  icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: 'text-emerald-500' },
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['pendiente', 'en_progreso', 'bloqueada', 'completada']

// ─── Priority ─────────────────────────────────────────────────────────────────

export const PRIORITY_COLOR: Record<Priority, string> = {
  baja: 'text-slate-400',
  media: 'text-blue-500',
  alta: 'text-amber-500',
  urgente: 'text-red-500',
}

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

// ─── Kanban columns ───────────────────────────────────────────────────────────

export const KANBAN_COLUMNS: { status: TaskStatus; label: string; headerColor: string }[] = [
  { status: 'pendiente',   label: _TASK_STATUS_BASE.pendiente.label,   headerColor: 'text-muted-foreground' },
  { status: 'en_progreso', label: _TASK_STATUS_BASE.en_progreso.label, headerColor: 'text-blue-600 dark:text-blue-400' },
  { status: 'bloqueada',   label: _TASK_STATUS_BASE.bloqueada.label,   headerColor: 'text-destructive' },
  { status: 'completada',  label: _TASK_STATUS_BASE.completada.label,  headerColor: 'text-emerald-600 dark:text-emerald-400' },
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function toInputDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

export function formatCompact(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(value)
}

export function formatFull(value: Date, withTime = false): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(value)
}
