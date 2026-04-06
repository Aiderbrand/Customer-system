import { TicketListContainer } from '@/features/tickets/components/ticket-list-container'

interface ProjectTicketsSectionProps {
  projectId: string
}

export function ProjectTicketsSection({ projectId }: ProjectTicketsSectionProps) {
  return <TicketListContainer projectId={projectId} mode="embedded" />
}
