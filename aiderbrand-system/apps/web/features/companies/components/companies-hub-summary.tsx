import { Building2, MailPlus, ShieldCheck, ShieldOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import type { CompanyHubSummary } from '@/lib/types'

export function CompaniesHubSummary({ summary }: { summary: CompanyHubSummary | null }) {
  if (!summary) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard icon={Building2} label="Total" value={summary.totalCompanies} hint="Companies visibles en el hub" />
      <SummaryCard icon={ShieldCheck} label="Activas" value={summary.activeCompanies} hint="Operativas hoy" />
      <SummaryCard icon={ShieldOff} label="Inactivas" value={summary.inactiveCompanies} hint="Sin hard-delete ni pérdida de trazabilidad" />
      <SummaryCard icon={MailPlus} label="Con invitaciones pendientes" value={summary.companiesWithPendingInvitations} hint="Requieren seguimiento de onboarding" />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Building2
  label: string
  value: number
  hint: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
          <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
