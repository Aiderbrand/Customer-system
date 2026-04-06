import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Tabs } from '@workspace/ui/components/tabs'
import { EmptyState } from '@/components/shared/empty-state'
import type { ProjectWorkspacePayload, ProjectWorkspaceTabId, Role } from '@/lib/types'
import type { ProjectSectionTab } from '@/features/projects/types'
import { ProjectWorkspaceHeader } from '@/features/projects/components/project-workspace-header'
import { ProjectSectionTabs } from '@/features/projects/components/project-section-tabs'
import { ProjectTicketsSection } from '@/features/projects/components/project-tickets-section'
import { ProjectActivitySection } from '@/features/projects/components/project-activity-section'
import { ProjectPhasesSection, type PhaseActions } from '@/features/projects/components/project-phases-section'
import { ProjectInternalNotesSection } from '@/features/projects/components/project-internal-notes-section'
interface ProjectDetailProps {
  workspace: ProjectWorkspacePayload
  tabs: ProjectSectionTab[]
  selectedSection: ProjectWorkspaceTabId
  canEditProject: boolean
  role: Role
  currentUserId: string | null
  onOpenProjectEdit: () => void
  onSectionChange: (value: ProjectWorkspaceTabId) => void
  onAddNote: (params: { phaseId: string | null; body: string }) => void
  sectionEmptyState: { title: string; description: string } | null
  phaseActions?: PhaseActions
}

export function ProjectDetail({
  workspace,
  tabs,
  selectedSection,
  canEditProject,
  role,
  currentUserId,
  onOpenProjectEdit,
  onSectionChange,
  onAddNote,
  sectionEmptyState,
  phaseActions,
}: ProjectDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProjectWorkspaceHeader
        workspace={workspace}
        canEditProject={canEditProject}
        onEditProject={onOpenProjectEdit}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          label="Progreso general"
          value={workspace.project.progressPct !== null ? `${workspace.project.progressPct}%` : '—'}
          hint="Avance del proyecto según fases visibles"
        />
        <OverviewCard
          label="Tickets abiertos"
          value={String(workspace.summary.openTickets)}
          hint="Incidencias activas vinculadas al proyecto"
        />
        <OverviewCard
          label="Fases visibles"
          value={String(workspace.summary.visiblePhases)}
          hint="Etapas publicadas para este rol"
        />
        <OverviewCard
          label="Próximo hito"
          value={workspace.summary.nextMilestone ?? 'Sin definir'}
          hint={
            workspace.project.targetLaunchAt
              ? `Objetivo ${formatDate(workspace.project.targetLaunchAt)}`
              : 'Sin fecha objetivo cargada'
          }
        />
      </div>

      <Tabs value={selectedSection} onValueChange={(value) => onSectionChange(value as ProjectWorkspaceTabId)} className="gap-4">
        <Card className="overflow-clip">
          <CardHeader className="gap-4 border-b p-4">
            <ProjectSectionTabs tabs={tabs} />
          </CardHeader>
          <CardContent className="p-4">
            {sectionEmptyState ? (
              <WorkspaceEmptyState title={sectionEmptyState.title} description={sectionEmptyState.description} />
            ) : (
              <WorkspaceSection
                workspace={workspace}
                selectedSection={selectedSection}
                role={role}
                currentUserId={currentUserId}
                onAddNote={onAddNote}
                phaseActions={phaseActions}
              />
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}

function WorkspaceSection({
  workspace,
  selectedSection,
  role,
  currentUserId,
  onAddNote,
  phaseActions,
}: {
  workspace: ProjectWorkspacePayload
  selectedSection: ProjectWorkspaceTabId
  role: Role
  currentUserId: string | null
  onAddNote: (params: { phaseId: string | null; body: string }) => void
  phaseActions?: PhaseActions
}) {
  switch (selectedSection) {
    case 'plan':
      return (
        <ProjectPhasesSection
          workspace={workspace}
          role={role}
          currentUserId={currentUserId}
          phaseActions={phaseActions}
        />
      )
    case 'tickets':
      return <ProjectTicketsSection projectId={workspace.project.id} />
    case 'activity':
      return <ProjectActivitySection workspace={workspace} />
    case 'team_notes':
      return <ProjectInternalNotesSection workspace={workspace} onAddNote={onAddNote} />
    default:
      return null
  }
}

function OverviewCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function WorkspaceEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState icon={CheckCircle2} title={title} description={description} />
  )
}

function formatDate(value: Date, withTime = false): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(value)
}
