import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import type { ProjectWorkspacePayload } from '@/lib/types'
import { PROJECT_STATUS_LABELS } from '@/features/projects/lib/project-selectors'

interface ProjectOverviewSectionProps {
  workspace: ProjectWorkspacePayload
}

export function ProjectOverviewSection({ workspace }: ProjectOverviewSectionProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Resumen operativo</CardTitle>
          <CardDescription>Un solo contexto base para estado, fases visibles y próximos pasos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InlineInfoRow label="Estado" value={PROJECT_STATUS_LABELS[workspace.project.status]} />
          <InlineInfoRow label="Fase actual" value={workspace.project.currentPhase ?? 'Sin definir'} />
          <InlineInfoRow label="Próximo hito" value={workspace.summary.nextMilestone ?? 'Sin definir'} />
          <InlineInfoRow
            label="Fecha objetivo"
            value={workspace.project.targetLaunchAt ? formatDate(workspace.project.targetLaunchAt) : 'Sin definir'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qué podés seguir desde acá</CardTitle>
          <CardDescription>Accesos rápidos sin duplicar metadata.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <QuickLink
            href={`/projects/${workspace.project.id}`}
            label="Revisar fases"
            hint="Ver progreso e hitos visibles"
          />
          <QuickLink
            href={`/projects/${workspace.project.id}?section=tickets`}
            label="Abrir tickets"
            hint="Ir directo al backlog vinculado"
          />
          <QuickLink
            href={`/projects/${workspace.project.id}?section=activity`}
            label="Ver actividad"
            hint="Consultar cambios recientes del proyecto"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function InlineInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border px-3 py-3 transition-colors hover:bg-muted/40">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <FolderKanban className="size-4 text-muted-foreground" />
    </Link>
  )
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
}
