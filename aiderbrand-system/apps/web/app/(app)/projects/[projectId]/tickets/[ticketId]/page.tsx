import { TicketDetailContainer } from '@/features/tickets/components/ticket-detail-container'
import { AppPage } from '@/components/layout/app-page'

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * ProjectTicketDetailPage — project-scoped ticket detail route.
 * Server Component — delegates rendering to TicketDetailContainer (client).
 * Passes both projectId and ticketId to the container.
 * Uses async params as required by Next.js 16 App Router.
 */
export default async function ProjectTicketDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; ticketId: string }>
}) {
  const { projectId, ticketId } = await params

  return (
    <AppPage fullHeight>
      <TicketDetailContainer ticketId={ticketId} projectId={projectId} />
    </AppPage>
  )
}
