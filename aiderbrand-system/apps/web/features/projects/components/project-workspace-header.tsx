import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { AppPageHeader } from '@/components/layout/app-page'
import type { ProjectWorkspacePayload } from '@/lib/types'
import {
  getProjectHealthLabel,
  PROJECT_STATUS_LABELS,
} from '@/features/projects/lib/project-selectors'

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
  return (
    <AppPageHeader
      title={workspace.project.name}
      description={[
        workspace.project.description,
        `Fase actual: ${workspace.project.currentPhase ?? 'Sin definir'}`,
        `Actualizado: ${formatDate(workspace.project.updatedAt)}`,
      ].filter(Boolean).join(' · ')}
      badge={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{PROJECT_STATUS_LABELS[workspace.project.status]}</Badge>
          {workspace.summary.health ? (
            <Badge variant="outline" className="gap-1.5">
              <ShieldAlert className="size-3.5" />
              {getProjectHealthLabel(workspace.summary.health)}
            </Badge>
          ) : null}
          <Badge variant="secondary">{workspace.project.companyName ?? 'Cuenta actual'}</Badge>
        </div>
      }
      actions={
        <>
          <Button variant="outline" onClick={onEditProject} disabled={!canEditProject}>
            Editar proyecto
          </Button>
          <Button asChild variant="outline">
            <Link href={`/projects/${workspace.project.id}`}>
              Ver fases
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/projects/${workspace.project.id}?section=tickets`}>
              Ver tickets
            </Link>
          </Button>
        </>
      }
    />
  )
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
}
