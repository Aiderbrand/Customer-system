'use client'

import { useCallback, useReducer } from 'react'
import type {
  CreatePhaseDTO,
  CreateProjectTaskDTO,
  SendNoteDTO,
  UpdatePhaseDTO,
  UpdateProjectTaskDTO,
} from '@/lib/types'
import {
  workspaceReducer,
  workspaceStateFromPayload,
  type WorkspaceAction,
  type WorkspaceState,
} from './workspace-reducer'
import type { ProjectWorkspacePayload } from '@/lib/types'

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseWorkspaceActionsResult {
  state: WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
  phaseActions: {
    create: (dto: CreatePhaseDTO) => void
    update: (id: string, dto: UpdatePhaseDTO) => void
    delete: (id: string) => void
    reorder: (orderedIds: string[]) => void
  }
  taskActions: {
    create: (dto: CreateProjectTaskDTO) => void
    update: (id: string, dto: UpdateProjectTaskDTO) => void
    delete: (id: string) => void
    move: (id: string, phaseId: string | null) => void
  }
  noteActions: {
    send: (dto: SendNoteDTO) => void
    reply: (dto: SendNoteDTO) => void
  }
}

export function useWorkspaceActions(workspace: ProjectWorkspacePayload | null): UseWorkspaceActionsResult {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    workspace ? workspaceStateFromPayload(workspace) : { phases: [], tasks: [], notes: [] },
  )

  // Optimistic stub helpers — in Phase 3/4 these will call the service and
  // roll back on error. For now they update local state only.

  const phaseActions = {
    create: useCallback((dto: CreatePhaseDTO) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        projectId: '',
        name: dto.name,
        order: (state.phases.length + 1),
        status: 'planificacion' as const,
        startsAt: dto.startsAt ?? null,
        dueAt: dto.dueAt ?? null,
        completedAt: null,
        ownerUserId: null,
        ownerName: null,
        milestone: dto.milestone ?? null,
        blocker: null,
        isClientVisible: dto.isClientVisible ?? false,
      }
      dispatch({ type: 'PHASE_CREATE', payload: optimistic })
    }, [state.phases.length]),

    update: useCallback((id: string, dto: UpdatePhaseDTO) => {
      dispatch({ type: 'PHASE_UPDATE', payload: { id, patch: dto } })
    }, []),

    delete: useCallback((id: string) => {
      dispatch({ type: 'PHASE_DELETE', payload: { id } })
    }, []),

    reorder: useCallback((orderedIds: string[]) => {
      dispatch({ type: 'PHASE_REORDER', payload: { orderedIds } })
    }, []),
  }

  const taskActions = {
    create: useCallback((dto: CreateProjectTaskDTO) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        projectId: '',
        phaseId: dto.phaseId ?? null,
        title: dto.title,
        status: 'pendiente' as const,
        completionType: null,
        priority: dto.priority,
        assigneeUserId: dto.assigneeUserId ?? null,
        assigneeName: null,
        dueAt: dto.dueAt ?? null,
        dueState: 'no-deadline' as const,
        dependencyTaskId: null,
        blockReason: null,
        resolutionNote: null,
        visibleToClient: false,
        checklist: [],
      }
      dispatch({ type: 'TASK_CREATE', payload: optimistic })
    }, []),

    update: useCallback((id: string, dto: UpdateProjectTaskDTO) => {
      dispatch({ type: 'TASK_UPDATE', payload: { id, patch: dto } })
    }, []),

    delete: useCallback((id: string) => {
      dispatch({ type: 'TASK_DELETE', payload: { id } })
    }, []),

    move: useCallback((id: string, phaseId: string | null) => {
      dispatch({ type: 'TASK_MOVE', payload: { id, phaseId } })
    }, []),
  }

  const noteActions = {
    send: useCallback((dto: SendNoteDTO) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        projectId: '',
        phaseId: dto.phaseId ?? null,
        authorId: '',
        authorName: '',
        body: dto.body,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      dispatch({ type: 'NOTE_SEND', payload: optimistic })
    }, []),

    reply: useCallback((dto: SendNoteDTO) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        projectId: '',
        phaseId: dto.phaseId ?? null,
        authorId: '',
        authorName: '',
        body: dto.body,
        parentId: dto.parentId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      dispatch({ type: 'NOTE_REPLY', payload: optimistic })
    }, []),
  }

  return { state, dispatch, phaseActions, taskActions, noteActions }
}
