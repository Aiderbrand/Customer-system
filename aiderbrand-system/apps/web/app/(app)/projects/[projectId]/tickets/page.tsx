import { TicketListContainer } from '@/features/tickets/components/ticket-list-container'

export default async function ProjectTicketsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <div className="p-6">
      <TicketListContainer projectId={projectId} />
    </div>
  )
}
