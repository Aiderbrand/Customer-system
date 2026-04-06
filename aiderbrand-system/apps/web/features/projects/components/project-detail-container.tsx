'use client'

import { useEffect, useMemo, useState } from 'react'
import { FolderX } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { ProjectDetail } from '@/features/projects/components/project-detail'
import { ProjectSettingsSheet, type ProjectSettingsPayload } from '@/features/projects/components/project-settings-sheet'
import { useProjectWorkspace } from '@/features/projects/hooks/use-projects'
import { useAuth } from '@/contexts/auth-context'
import type {
  CreatePhaseDTO,
  ProjectPhaseSummary,
  ProjectWorkspacePayload,
  UpdatePhaseDTO,
} from '@/lib/types'
import { canEditProjectWorkspace } from '@/features/projects/lib/project-selectors'
import { projectService } from '@/lib/services/project-service'
import type { PhaseActions } from '@/features/projects/components/project-phases-section'

function ProjectWorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-[32rem]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ProjectWorkspaceContainerProps {
  projectId: string
}

export function ProjectWorkspaceContainer({ projectId }: ProjectWorkspaceContainerProps) {
  const {
    workspace,
    loading,
    error,
    refetch,
    tabs,
    selectedSection,
    setSelectedSection,
    sectionEmptyState,
  } = useProjectWorkspace(projectId)
  const { currentRole, currentUser } = useAuth()
  const [draftWorkspace, setDraftWorkspace] = useState<ProjectWorkspacePayload | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    setDraftWorkspace(workspace)
  }, [workspace])

  const effectiveWorkspace = draftWorkspace ?? workspace
  const canEditProject = useMemo(() => {
    if (!effectiveWorkspace || !currentRole) {
      return false
    }

    return canEditProjectWorkspace(currentRole, effectiveWorkspace)
  }, [currentRole, effectiveWorkspace])

  // ─── Phase actions ──────────────────────────────────────────────────────────

  const phaseActions: PhaseActions = useMemo(() => ({
    create: async (dto: CreatePhaseDTO) => {
      try {
        const phase = await projectService.createPhase(projectId, dto)
        setDraftWorkspace((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            phases: [...prev.phases, phase],
            summary: {
              ...prev.summary,
              visiblePhases: prev.summary.visiblePhases + 1,
            },
          }
        })
        toast.success('Fase creada', { description: `"${phase.name}" fue agregada al plan.` })
      } catch (err) {
        console.error('[phaseActions.create]', err)
        toast.error('No se pudo crear la fase', { description: 'Revisá tu conexión y volvé a intentarlo.' })
        throw err
      }
    },

    update: async (id: string, dto: UpdatePhaseDTO) => {
      try {
        const phase = await projectService.updatePhase(projectId, id, dto)
        setDraftWorkspace((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            phases: prev.phases.map((p) => p.id === id ? phase : p),
          }
        })
        toast.success('Fase actualizada')
      } catch (err) {
        console.error('[phaseActions.update]', err)
        toast.error('No se pudo actualizar la fase')
        throw err
      }
    },

    delete: async (id: string) => {
      const phaseName = effectiveWorkspace?.phases.find((p) => p.id === id)?.name
      try {
        await projectService.deletePhase(projectId, id)
        setDraftWorkspace((prev) => {
          if (!prev) return prev
          const remaining = prev.phases.filter((p) => p.id !== id)
          return {
            ...prev,
            phases: remaining,
            summary: {
              ...prev.summary,
              visiblePhases: Math.max(0, prev.summary.visiblePhases - 1),
            },
          }
        })
        toast.success('Fase eliminada', {
          description: phaseName ? `"${phaseName}" fue removida del plan.` : undefined,
        })
      } catch (err) {
        console.error('[phaseActions.delete]', err)
        toast.error('No se pudo eliminar la fase')
        throw err
      }
    },

    reorder: async (orderedIds: string[]) => {
      const prevPhases = effectiveWorkspace?.phases ?? []
      // Optimistic update
      setDraftWorkspace((prev) => {
        if (!prev) return prev
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]))
        return {
          ...prev,
          phases: [...prev.phases]
            .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
            .map((p, i) => ({ ...p, order: i + 1 })),
        }
      })
      try {
        await projectService.reorderPhases(projectId, { orderedIds })
      } catch (err) {
        // Rollback
        setDraftWorkspace((prev) => prev ? { ...prev, phases: prevPhases } : prev)
        console.error('[phaseActions.reorder]', err)
        toast.error('No se pudo reordenar las fases')
        throw err
      }
    },
  }), [effectiveWorkspace?.phases, projectId])

  // ─── Render guards ──────────────────────────────────────────────────────────

  if (loading) {
    return <ProjectWorkspaceSkeleton />
  }

  if (error) {
    return (
      <EmptyState
        icon={FolderX}
        title="Error al cargar el proyecto"
        description={error}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    )
  }

  if (!effectiveWorkspace || !currentRole) {
    return (
      <EmptyState
        icon={FolderX}
        title="Proyecto no encontrado"
        description="El proyecto que buscás no existe o no tenés acceso a este workspace."
      />
    )
  }

  async function handleAddNote(params: { phaseId: string | null; body: string }) {
    try {
      const note = await projectService.sendNote(projectId, {
        body: params.body,
        phaseId: params.phaseId,
      })
      setDraftWorkspace((prev) => {
        if (!prev?.internal) return prev
        return {
          ...prev,
          internal: {
            ...prev.internal,
            notes: [...prev.internal.notes, note],
          },
        }
      })
    } catch (err) {
      console.error('[handleAddNote]', err)
      toast.error('No se pudo guardar la nota')
    }
  }

  function handleProjectSave(payload: ProjectSettingsPayload) {
    setDraftWorkspace((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        project: {
          ...current.project,
          name: payload.name,
          description: payload.description,
          status: payload.status,
          currentPhase: payload.currentPhase,
          targetLaunchAt: payload.targetLaunchAt,
          updatedAt: new Date(),
        },
        internal: current.internal
          ? {
              ...current.internal,
              admin: {
                ...current.internal.admin,
                targetLaunchAt: payload.targetLaunchAt,
                lastUpdatedAt: new Date(),
              },
            }
          : current.internal,
      }
    })

    toast.success('Proyecto actualizado', {
      description: 'La configuración operativa quedó alineada en todo el workspace.',
    })
  }

  return (
    <>
      <ProjectDetail
        workspace={effectiveWorkspace}
        tabs={tabs}
        selectedSection={selectedSection}
        canEditProject={canEditProject}
        role={currentRole}
        currentUserId={currentUser?.id ?? null}
        onOpenProjectEdit={() => setEditDialogOpen(true)}
        onSectionChange={setSelectedSection}
        onAddNote={handleAddNote}
        sectionEmptyState={sectionEmptyState}
        phaseActions={phaseActions}
      />

      <ProjectSettingsSheet
        open={editDialogOpen}
        project={effectiveWorkspace.project}
        admin={effectiveWorkspace.internal?.admin ?? null}
        phases={effectiveWorkspace.phases}
        onOpenChange={setEditDialogOpen}
        onSave={handleProjectSave}
      />
    </>
  )
}
