import type { PhaseStatus, TaskStatus } from '@/lib/types'

export interface StatusConfig {
  label: string
  dot: string
  text: string
  badge: string
}

export interface TaskStatusConfig {
  label: string
  color: string
}

export const PHASE_STATUS_CONFIG: Record<PhaseStatus, StatusConfig> = {
  planificacion: { label: 'Planificación', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400' },
  desarrollo:    { label: 'Desarrollo',    dot: 'bg-blue-500',  text: 'text-blue-600 dark:text-blue-400',   badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  pruebas:       { label: 'Pruebas',       dot: 'bg-violet-500',text: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  revision:      { label: 'Revisión',      dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400',  badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  produccion:    { label: 'Producción',    dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400',  badge: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  completada:    { label: 'Completada',    dot: 'bg-emerald-500',text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  pendiente:   { label: 'Pendiente',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  en_progreso: { label: 'En progreso', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  bloqueada:   { label: 'Bloqueada',   color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  completada:  { label: 'Completada',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
}

export const TICKET_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso',  label: 'En proceso' },
  { value: 'cerrado',     label: 'Cerrado' },
]
