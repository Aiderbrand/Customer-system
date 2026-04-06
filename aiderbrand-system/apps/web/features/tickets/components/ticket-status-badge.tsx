import { CheckCircle2, Clock3, LoaderCircle, Search } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { TicketStatus } from "@/lib/types"

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TicketStatus,
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
    icon: typeof Clock3
  }
> = {
  pendiente: {
    label: "Pendiente",
    variant: "neutral",
    icon: Clock3,
  },
  en_revision: {
    label: "En revisión",
    variant: "warning",
    icon: Search,
  },
  en_proceso: {
    label: "En proceso",
    variant: "info",
    icon: LoaderCircle,
  },
  cerrado: {
    label: "Cerrado",
    variant: "success",
    icon: CheckCircle2,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketStatusBadgeProps {
  status: TicketStatus
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketStatusBadge — presentational badge for ticket status.
 * Pure component — no hooks.
 */
export function TicketStatusBadge({
  status,
  className,
}: TicketStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {config.label}
    </Badge>
  )
}
