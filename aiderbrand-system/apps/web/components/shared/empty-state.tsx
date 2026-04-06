import type { LucideIcon } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EmptyState — clean centered layout for empty lists or not-found states.
 * Pure presentational — no hooks, no data fetching.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Empty className="min-h-[18rem] border bg-muted/10">
      <EmptyHeader>
        {Icon ? (
          <EmptyMedia variant="icon">
            <Icon className="text-muted-foreground" aria-hidden="true" />
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
