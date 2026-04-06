import { AlertTriangle, FolderKanban, PauseCircle, Ticket } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import type { ProjectAudience, ProjectHubSummary } from '@/lib/types'

interface ProjectsHubSummaryProps {
  summary: ProjectHubSummary | null
  audience: ProjectAudience
}

const SUMMARY_ITEMS = {
  total: FolderKanban,
  openTickets: Ticket,
  paused: PauseCircle,
  risk: AlertTriangle,
} as const

export function ProjectsHubSummary({ summary, audience }: ProjectsHubSummaryProps) {
  if (!summary) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={SUMMARY_ITEMS.total}
        label="Total"
        value={summary.totalProjects}
        hint="Proyectos visibles en el hub"
      />
      <SummaryCard
        icon={SUMMARY_ITEMS.total}
        label="Activos"
        value={summary.activeProjects}
        hint="En curso o con trabajo vigente"
      />
      <SummaryCard
        icon={SUMMARY_ITEMS.openTickets}
        label="Con tickets abiertos"
        value={summary.projectsWithOpenTickets}
        hint="Necesitan seguimiento actual"
      />
      <SummaryCard
        icon={audience === 'internal' ? SUMMARY_ITEMS.risk : SUMMARY_ITEMS.paused}
        label={audience === 'internal' ? 'En riesgo' : 'Pausados'}
        value={audience === 'internal' ? (summary.projectsAtRisk ?? 0) : summary.pausedProjects}
        hint={
          audience === 'internal'
            ? 'Salud operativa comprometida'
            : 'Proyectos temporalmente detenidos'
        }
        emphasize={audience === 'internal' && (summary.projectsAtRisk ?? 0) > 0}
      />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  emphasize = false,
}: {
  icon: typeof FolderKanban
  label: string
  value: number
  hint: string
  emphasize?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </CardTitle>
          <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        <p className={emphasize ? 'text-3xl font-semibold text-amber-600 dark:text-amber-400' : 'text-3xl font-semibold'}>
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
