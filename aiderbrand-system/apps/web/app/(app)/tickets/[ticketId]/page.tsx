import { TicketDetailContainer } from '@/features/tickets/components/ticket-detail-container'
import { AppPage } from '@/components/layout/app-page'

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * TicketDetailPage — global ticket detail route.
 * Server Component — delegates rendering to TicketDetailContainer (client).
 * Uses async params as required by Next.js 16 App Router.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>
}) {
  const { ticketId } = await params

  return (
    <AppPage fullHeight>
      <TicketDetailContainer ticketId={ticketId} />
    </AppPage>
  )
}
