import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { Priority } from "@/lib/types"

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "neutral"
      | "info"
      | "success"
      | "warning"
    icon: typeof AlertTriangle
  }
> = {
  urgente: {
    label: "Urgente",
    variant: "destructive",
    icon: AlertTriangle,
  },
  alta: {
    label: "Alta",
    variant: "warning",
    icon: ArrowUp,
  },
  media: {
    label: "Media",
    variant: "secondary",
    icon: Minus,
  },
  baja: {
    label: "Baja",
    variant: "outline",
    icon: ArrowDown,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketPriorityBadgeProps {
  priority: Priority
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketPriorityBadge — presentational badge for ticket priority.
 * Shows a CircleAlert icon for urgente priority.
 * Pure component — no hooks.
 */
export function TicketPriorityBadge({
  priority,
  className,
}: TicketPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {config.label}
    </Badge>
  )
}
