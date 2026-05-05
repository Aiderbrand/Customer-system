import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { Tabs } from '@workspace/ui/components/tabs'
import { EmptyState } from '@/components/shared/empty-state'
import type { ProjectWorkspacePayload, ProjectWorkspaceTabId, Role } from '@/lib/types'
import type { ProjectSectionTab } from '@/features/projects/types'
import { ProjectWorkspaceHeader } from '@/features/projects/components/project-workspace-header'
import { ProjectSectionTabs } from '@/features/projects/components/project-section-tabs'
import { ProjectTicketsSection } from '@/features/projects/components/project-tickets-section'
import { ProjectActivitySection } from '@/features/projects/components/project-activity-section'
import { ProjectPhasesSection, type PhaseActions, type TaskActions } from '@/features/projects/components/project-phases-section'
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
  taskActions?: TaskActions
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
  taskActions,
}: ProjectDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProjectWorkspaceHeader
        workspace={workspace}
        canEditProject={canEditProject}
        onEditProject={onOpenProjectEdit}
      />

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
                taskActions={taskActions}
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
  taskActions,
}: {
  workspace: ProjectWorkspacePayload
  selectedSection: ProjectWorkspaceTabId
  role: Role
  currentUserId: string | null
  onAddNote: (params: { phaseId: string | null; body: string }) => void
  phaseActions?: PhaseActions
  taskActions?: TaskActions
}) {
  switch (selectedSection) {
    case 'plan':
      return (
        <ProjectPhasesSection
          workspace={workspace}
          role={role}
          currentUserId={currentUserId}
          phaseActions={phaseActions}
          taskActions={taskActions}
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

function WorkspaceEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState icon={CheckCircle2} title={title} description={description} />
  )
}
