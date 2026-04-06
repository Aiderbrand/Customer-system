import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import type { ProjectWorkspacePayload } from '@/lib/types'

interface ProjectGeneralSectionProps {
  workspace: ProjectWorkspacePayload
  canEditProject: boolean
  onEditProject: () => void
}

export function ProjectGeneralSection({
  workspace,
  canEditProject,
  onEditProject,
}: ProjectGeneralSectionProps) {
  const admin = workspace.internal?.admin ?? null

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Responsables del proyecto</CardTitle>
          <CardDescription>Referentes y estado operativo actual del proyecto.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InlineInfoRow label="Project Lead" value={admin?.projectLeadName ?? 'Sin asignar'} />
          <InlineInfoRow label="Delivery Owner" value={admin?.deliveryOwnerName ?? 'Sin asignar'} />
          <InlineInfoRow
            label="Fecha objetivo"
            value={admin?.targetLaunchAt ? formatDate(admin.targetLaunchAt) : 'Sin definir'}
          />
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <span className="text-sm text-muted-foreground">Dependencias listas</span>
            <Badge variant={admin?.isDependencyReady ? 'outline' : 'secondary'}>
              {admin?.isDependencyReady ? 'Lista para editar' : 'Pendiente'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones del proyecto</CardTitle>
          <CardDescription>Centralizá la edición y el contexto clave del proyecto desde esta vista.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
            {canEditProject
              ? 'La edición está disponible para este proyecto.'
              : 'La edición se habilita cuando el proyecto tiene dependencias listas y un rol autorizado.'}
          </div>
          <div className="flex justify-end">
            <Button onClick={onEditProject} disabled={!canEditProject}>
              Editar proyecto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InlineInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
}
