import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import type { CompanyDetailFact, CompanyDetailMetric } from './company-detail-types'

interface CompanyDetailOverviewProps {
  metrics: CompanyDetailMetric[]
  facts: CompanyDetailFact[]
}

export function CompanyDetailOverview({ metrics, facts }: CompanyDetailOverviewProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="company-overview-title">
      <div className="flex flex-col gap-1">
        <h2 id="company-overview-title" className="text-xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">Resumen visible siempre, usando solo datos reales ya presentes en el payload.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-0">
                <p className="text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ficha operativa</CardTitle>
            <CardDescription>Contexto base para soporte, seguimiento y decisiones de operación.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {facts.map((fact, index) => (
              <div key={fact.label} className="flex flex-col gap-4">
                {index > 0 ? <Separator /> : null}
                <div className="grid gap-1">
                  <p className="text-sm text-muted-foreground">{fact.label}</p>
                  <p className="font-medium text-foreground">{fact.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
