import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TimelineItem } from './timeline-item'
import type { TimelineEvent, Attachment } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketTimelineProps {
  events: TimelineEvent[]
  currentUserId: string
  className?: string
  onOpenFile?: (attachment: Attachment) => void
}

export function TicketTimeline({ events, currentUserId, className, onOpenFile }: TicketTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Sin actividad aún.</p>
      </div>
    )
  }

  return (
    <ScrollArea className={className}>
      <div className="flex flex-col py-2 pr-1">
        {events.map((event, index) => {
          const isComment = event.type === 'comment'
          const prevEvent = events[index - 1]
          const prevIsComment = index > 0 && prevEvent?.type === 'comment'
          const nextEvent = events[index + 1]
          const nextIsComment = nextEvent?.type === 'comment'

          return (
            <div
              key={`${event.type}-${event.at.toISOString()}-${index}`}
              className={
                isComment
                  ? prevIsComment ? 'mt-3' : 'mt-4'
                  : [prevIsComment ? 'mt-4' : 'mt-2', nextIsComment ? 'mb-2' : 'mb-1'].join(' ')
              }
            >
              <TimelineItem
                event={event}
                currentUserId={currentUserId}
                onOpenFile={onOpenFile}
              />
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
