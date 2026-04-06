'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import {
  ProjectCreateDialog,
  type CreateProjectRequest,
} from '@/features/projects/components/project-create-dialog'
import { ProjectsHub } from '@/features/projects/components/projects-hub'
import { useProjectsHub } from '@/features/projects/hooks/use-projects'
import { projectService } from '@/lib/services/project-service'

function ProjectHubSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-10 w-full lg:max-w-sm" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProjectListContainer() {
  const router = useRouter()
  const {
    hub,
    projects,
    loading,
    error,
    refetch,
    filters,
    companyOptions,
    setCompanyId,
    setSearch,
    toggleStatus,
    clearFilters,
    emptyState,
    statusOptions,
    canCreateProject,
  } = useProjectsHub()
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreateProject(payload: CreateProjectRequest) {
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      const createdProject = await projectService.createProject(payload.companyId, {
        name: payload.name,
        description: payload.description,
      })

      toast.success('Proyecto creado', {
        description: 'El workspace inicial ya quedó disponible para seguir operando.',
      })
      setCreateOpen(false)
      await refetch()
      router.push(`/projects/${createdProject.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el proyecto.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  if (loading) {
    return <ProjectHubSkeleton />
  }

  if (error) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Error al cargar proyectos"
        description={error}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    )
  }

  if (!hub) {
    return null
  }

  const actions = canCreateProject
    ? <Button onClick={() => setCreateOpen(true)}>Nuevo proyecto</Button>
    : undefined

  return (
    <>
      {emptyState ? (
        <div className="flex flex-col gap-6">
          <ProjectsHub
            summary={hub.summary}
            projects={projects}
            audience={hub.audience}
            filters={filters}
            companyOptions={companyOptions}
            onCompanyChange={setCompanyId}
            onSearchChange={setSearch}
            onToggleStatus={toggleStatus}
            onClearFilters={clearFilters}
            statusOptions={statusOptions}
            actions={actions}
            emptyState={
              <EmptyState
                icon={FolderOpen}
                title={emptyState.title}
                description={emptyState.description}
                action={emptyState.canReset ? (
                  <Button variant="outline" onClick={() => clearFilters()}>
                    Limpiar filtros
                  </Button>
                ) : undefined}
              />
            }
          />
        </div>
      ) : (
        <ProjectsHub
          summary={hub.summary}
          projects={projects}
          audience={hub.audience}
          filters={filters}
          companyOptions={companyOptions}
          onCompanyChange={setCompanyId}
          onSearchChange={setSearch}
          onToggleStatus={toggleStatus}
          onClearFilters={clearFilters}
          statusOptions={statusOptions}
          actions={actions}
        />
      )}

      <ProjectCreateDialog
        open={createOpen}
        companyOptions={companyOptions}
        initialCompanyId={filters.companyId}
        submitting={createSubmitting}
        error={createError}
        onOpenChange={(nextOpen) => {
          setCreateError(null)
          setCreateOpen(nextOpen)
        }}
        onSubmit={handleCreateProject}
      />
    </>
  )
}
