import { Clock3 } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import type { ProjectWorkspacePayload } from '@/lib/types'

interface ProjectActivitySectionProps {
  workspace: ProjectWorkspacePayload
}

export function ProjectActivitySection({ workspace }: ProjectActivitySectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {workspace.activity.map((event) => (
        <Card key={event.id}>
          <CardContent className="flex gap-3 p-4">
            <div className="mt-0.5 rounded-full bg-muted p-2">
              <Clock3 className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">{event.label}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              <p className="text-xs text-muted-foreground">{formatDate(event.happenedAt, true)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
