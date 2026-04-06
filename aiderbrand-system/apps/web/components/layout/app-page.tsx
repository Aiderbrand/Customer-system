import type { ReactNode } from 'react'
import { cn } from '@workspace/ui/lib/utils'

interface AppPageProps {
  children: ReactNode
  className?: string
  fullHeight?: boolean
}

interface AppPageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

export function AppPage({ children, className, fullHeight = false }: AppPageProps) {
  return (
    <section
      className={cn(
        'mx-auto flex min-w-0 w-full max-w-screen-2xl flex-1 flex-col gap-6',
        fullHeight && 'min-h-0 overflow-hidden',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function AppPageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: AppPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-card px-6 py-5 shadow-sm lg:flex-row lg:items-start lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {badge}
        </div>
        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
