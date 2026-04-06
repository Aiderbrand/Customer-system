import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import type { CompanyActivityItem } from '@/lib/types'
import { formatCompanyDate } from './company-detail-types'

interface CompanyActivitySectionProps {
  items: CompanyActivityItem[]
}

export function CompanyActivitySection({ items }: CompanyActivitySectionProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="company-activity-title">
      <div className="flex flex-col gap-1">
        <h2 id="company-activity-title" className="text-xl font-semibold tracking-tight">Activity</h2>
        <p className="text-sm text-muted-foreground">Eventos auditables visibles solo cuando el permiso actual ya lo permite.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Registro operativo para seguimiento interno y soporte.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay eventos auditables registrados para esta company.</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="flex flex-col gap-3 pr-3">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-xl border bg-muted/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{item.action}</p>
                      <span className="text-sm text-muted-foreground">{formatCompanyDate(item.createdAt, true)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.entityType ?? 'Entidad'}
                      {item.entityId ? ` · ${item.entityId}` : ''}
                      {item.actorId ? ` · actor ${item.actorId}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
