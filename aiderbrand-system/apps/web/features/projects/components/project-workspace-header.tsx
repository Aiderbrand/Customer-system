import { AlertCircle, Calendar, ShieldAlert, Target, TrendingUp } from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { PhaseStatus, ProjectWorkspacePayload } from '@/lib/types'
import {
  getProjectHealthLabel,
  PROJECT_STATUS_LABELS,
} from '@/features/projects/lib/project-selectors'
import { PHASE_STATUS_CONFIG } from '@/lib/status-configs'

interface ProjectWorkspaceHeaderProps {
  workspace: ProjectWorkspacePayload
  canEditProject: boolean
  onEditProject: () => void
}

export function ProjectWorkspaceHeader({
  workspace,
  canEditProject,
  onEditProject,
}: ProjectWorkspaceHeaderProps) {
  const { project, phases, summary } = workspace

  const currentPhase = phases.find((p) => p.name === project.currentPhase) ?? null
  const pct = project.progressPct

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-5 shadow-sm">
      {/* ── Top row: title + actions ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
            {summary.health ? (
              <Badge variant="outline" className="gap-1.5">
                <ShieldAlert className="size-3.5" />
                {getProjectHealthLabel(summary.health)}
              </Badge>
            ) : null}
            <Badge variant="secondary">{project.companyName ?? 'Cuenta actual'}</Badge>
          </div>

          {project.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          ) : null}
        </div>

        <Button variant="outline" onClick={onEditProject} disabled={!canEditProject} className="shrink-0">
          Editar proyecto
        </Button>
      </div>

      {/* ── Bottom row: contextual status ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3">
        {/* Current phase */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Fase actual</span>
          {currentPhase ? (
            <div className="flex items-center gap-1.5">
              <span className={['h-2 w-2 rounded-full shrink-0', PHASE_STATUS_CONFIG[currentPhase.status].dot].join(' ')} />
              <span className="text-sm font-medium text-foreground">{currentPhase.name}</span>
              <span className={['text-xs', PHASE_STATUS_CONFIG[currentPhase.status].text].join(' ')}>
                · {PHASE_STATUS_CONFIG[currentPhase.status].label}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/50">Sin definir</span>
          )}
        </div>

        <Divider />

        {/* Progress */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          {pct !== null ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm tabular-nums text-foreground font-medium">{pct}%</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/50">Sin progreso</span>
          )}
        </div>

        {/* Milestone */}
        {(summary.nextMilestone || project.targetLaunchAt) && (
          <>
            <Divider />
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              {summary.nextMilestone && (
                <span className="text-sm text-foreground">{summary.nextMilestone}</span>
              )}
              {project.targetLaunchAt && (
                <span className="text-xs text-muted-foreground">
                  {summary.nextMilestone ? '·' : ''} Objetivo {formatDate(project.targetLaunchAt)}
                </span>
              )}
            </div>
          </>
        )}

        {/* Open tickets */}
        {summary.openTickets > 0 && (
          <>
            <Divider />
            <div className="flex items-center gap-1.5">
              <AlertCircle className={['h-3.5 w-3.5 shrink-0', summary.openTickets > 3 ? 'text-destructive' : 'text-amber-500'].join(' ')} />
              <span className={['text-sm tabular-nums', summary.openTickets > 3 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'].join(' ')}>
                {summary.openTickets} {summary.openTickets === 1 ? 'ticket abierto' : 'tickets abiertos'}
              </span>
            </div>
          </>
        )}

        {/* Last updated */}
        <div className="ml-auto flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/40">
            {formatDate(project.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <span className="h-3.5 w-px bg-border" aria-hidden />
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
}
