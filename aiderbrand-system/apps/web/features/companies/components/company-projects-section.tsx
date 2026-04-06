'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, FolderKanban, Plus, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import {
  ProjectCreateDialog,
  type CreateProjectRequest,
} from '@/features/projects/components/project-create-dialog'
import { PROJECT_STATUS_LABELS } from '@/features/projects/lib/project-selectors'
import { projectService } from '@/lib/services/project-service'
import type { ProjectWithStats } from '@/lib/types'

interface CompanyProjectsSectionProps {
  companyId: string
  companyName: string
  canCreateProject: boolean
  onProjectCreated?: () => Promise<void> | void
}

function ProjectsSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3" data-testid="company-projects-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CompanyProjectsSection({
  companyId,
  companyName,
  canCreateProject,
  onProjectCreated,
}: CompanyProjectsSectionProps) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const items = await projectService.getProjects([companyId])
      setProjects(items)
    } catch (err) {
      console.error('[CompanyProjectsSection] Error fetching projects', err)
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los proyectos de esta company.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  async function handleCreateProject(payload: CreateProjectRequest) {
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      const createdProject = await projectService.createProject(payload.companyId, {
        name: payload.name,
        description: payload.description,
      })

      setCreateOpen(false)
      toast.success('Proyecto creado', {
        description: `${createdProject.name} ya quedó disponible dentro de ${companyName}.`,
      })

      await fetchProjects()
      void onProjectCreated?.()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el proyecto.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="company-projects-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="company-projects-title" className="text-xl font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Alta y seguimiento operativo de proyectos reales vinculados a esta company.
          </p>
        </div>

        {canCreateProject ? (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            Nuevo proyecto
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Esta sección usa el contrato real de proyectos para listar el estado actual y dar de alta nuevos workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? <ProjectsSectionSkeleton /> : null}

          {!loading && error ? (
            <EmptyState
              icon={AlertCircle}
              title="No pudimos cargar los proyectos"
              description={error}
              action={
                <Button variant="outline" onClick={() => void fetchProjects()}>
                  Reintentar
                </Button>
              }
            />
          ) : null}

          {!loading && !error && projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Todavía no hay proyectos en esta company"
              description="Cuando registres el primero vas a poder entrar directo a su workspace desde acá mismo."
              action={canCreateProject ? (
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="size-4" />
                  Crear primer proyecto
                </Button>
              ) : undefined}
            />
          ) : null}

          {!loading && !error && projects.length > 0 ? (
            <div className="flex flex-col gap-3" data-testid="company-projects-list">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="link" className="h-auto w-fit px-0 text-left text-base font-semibold text-foreground">
                        <Link href={`/projects/${project.id}`}>{project.name}</Link>
                      </Button>
                      <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {project.description || 'Sin descripción operativa todavía.'}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{project.ticketCount} ticket{project.ticketCount === 1 ? '' : 's'} totales</span>
                      <span>{project.openTicketCount} abierto{project.openTicketCount === 1 ? '' : 's'}</span>
                      <span>Actualizado {formatProjectDate(project.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Badge variant="secondary" className="gap-1.5">
                      <Ticket className="size-3.5" />
                      {project.openTicketCount} abierto{project.openTicketCount === 1 ? '' : 's'}
                    </Badge>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${project.id}`}>Abrir workspace</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ProjectCreateDialog
        open={createOpen}
        fixedCompanyId={companyId}
        fixedCompanyName={companyName}
        submitting={createSubmitting}
        error={createError}
        onOpenChange={(nextOpen) => {
          setCreateError(null)
          setCreateOpen(nextOpen)
        }}
        onSubmit={handleCreateProject}
      />
    </section>
  )
}

function formatProjectDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
  }).format(value)
}
