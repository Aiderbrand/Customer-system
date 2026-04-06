import { ProjectWorkspaceContainer } from '@/features/projects/components/project-workspace-container'
import { AppPage } from '@/components/layout/app-page'

// Next.js 16: params is a Promise
export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <AppPage>
      <ProjectWorkspaceContainer projectId={projectId} />
    </AppPage>
  )
}
