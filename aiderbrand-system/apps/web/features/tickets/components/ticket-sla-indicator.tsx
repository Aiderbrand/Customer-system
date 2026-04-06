import { cn } from '@workspace/ui/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import {
  getSlaStatus,
  getSlaRemainingPercentage,
  formatSlaRemaining,
} from '@/lib/sla'
import type { SlaStatus } from '@/lib/sla'

// ─── Config ───────────────────────────────────────────────────────────────────

const SLA_STYLE: Record<SlaStatus, { text: string; bar: string; pulse: boolean }> = {
  ok: {
    text: 'text-green-600 dark:text-green-400',
    bar: 'bg-green-500',
    pulse: false,
  },
  warning: {
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    pulse: false,
  },
  critical: {
    text: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
    pulse: true,
  },
  overdue: {
    text: 'text-red-700 dark:text-red-300',
    bar: 'bg-red-600',
    pulse: true,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadlineLabel(deadline: Date): string {
  return deadline.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketSlaIndicatorProps {
  deadline: Date
  createdAt: Date
  showLabel?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketSlaIndicator — shows remaining SLA time with a colored progress bar.
 * Wraps content in a Tooltip showing the exact deadline datetime.
 * Pure component — no hooks.
 */
export function TicketSlaIndicator({
  deadline,
  createdAt,
  showLabel = false,
  className,
}: TicketSlaIndicatorProps) {
  const status = getSlaStatus(deadline)
  const percentage = getSlaRemainingPercentage(createdAt, deadline)
  const remaining = formatSlaRemaining(deadline)
  const style = SLA_STYLE[status]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex flex-col gap-1 min-w-[80px]', className)}>
            {/* Text label */}
            <span
              className={cn(
                'text-xs font-medium leading-none',
                style.text,
                style.pulse && 'animate-pulse',
              )}
            >
              {status === 'overdue' ? 'Vencido' : remaining}
            </span>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  style.bar,
                  style.pulse && 'animate-pulse',
                )}
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={Math.round(percentage)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`SLA: ${remaining}`}
              />
            </div>

            {/* Optional label */}
            {showLabel && (
              <span className="text-[10px] text-muted-foreground leading-none">SLA</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Vence: {formatDeadlineLabel(deadline)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
