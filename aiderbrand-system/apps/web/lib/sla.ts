import type { Priority } from '@/lib/types'

export const SLA_HOURS: Record<Priority, number> = {
  urgente: 48,
  alta: 48,
  media: 72,
  baja: 120,
}

/**
 * Calculate SLA deadline based on priority and creation date.
 */
export function calculateSlaDeadline(priority: Priority, createdAt: Date): Date {
  const deadline = new Date(createdAt)
  deadline.setHours(deadline.getHours() + SLA_HOURS[priority])
  return deadline
}

export type SlaStatus = 'ok' | 'warning' | 'critical' | 'overdue'

/**
 * Get the current SLA status based on deadline.
 * - overdue:  deadline has passed
 * - critical: less than 4 hours remaining
 * - warning:  less than 12 hours remaining
 * - ok:       more than 12 hours remaining
 */
export function getSlaStatus(deadline: Date, now: Date = new Date()): SlaStatus {
  const remainingMs = deadline.getTime() - now.getTime()
  if (remainingMs <= 0) return 'overdue'

  const totalHours = remainingMs / (1000 * 60 * 60)
  if (totalHours <= 4) return 'critical'
  if (totalHours <= 12) return 'warning'
  return 'ok'
}

/**
 * Get the percentage of SLA time remaining (0-100).
 * Returns 0 when overdue, 100 when just created.
 */
export function getSlaRemainingPercentage(
  createdAt: Date,
  deadline: Date,
  now: Date = new Date(),
): number {
  const total = deadline.getTime() - createdAt.getTime()
  const remaining = deadline.getTime() - now.getTime()
  return Math.max(0, Math.min(100, (remaining / total) * 100))
}

/**
 * Format remaining SLA time in rioplatense Spanish.
 * Examples: "Vencido", "2d 3h", "4h 30m"
 */
export function formatSlaRemaining(deadline: Date, now: Date = new Date()): string {
  const remainingMs = deadline.getTime() - now.getTime()
  if (remainingMs <= 0) return 'Vencido'

  const hours = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}
