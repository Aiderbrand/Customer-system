import type {
  ProjectNote,
  ProjectPendingTaskSummary,
  ProjectPhaseSummary,
  ProjectWorkspacePayload,
} from '@/lib/types'

// ─── State ────────────────────────────────────────────────────────────────────

export interface WorkspaceState {
  phases: ProjectPhaseSummary[]
  tasks: ProjectPendingTaskSummary[]
  notes: ProjectNote[]
}

export function workspaceStateFromPayload(payload: ProjectWorkspacePayload): WorkspaceState {
  return {
    phases: payload.phases,
    tasks: payload.tasks,
    notes: payload.internal?.notes ?? [],
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type WorkspaceAction =
  | { type: 'WORKSPACE_INIT'; payload: WorkspaceState }
  | { type: 'WORKSPACE_RESET' }
  | { type: 'PHASE_CREATE'; payload: ProjectPhaseSummary }
  | { type: 'PHASE_UPDATE'; payload: { id: string; patch: Partial<ProjectPhaseSummary> } }
  | { type: 'PHASE_DELETE'; payload: { id: string } }
  | { type: 'PHASE_REORDER'; payload: { orderedIds: string[] } }
  | { type: 'TASK_CREATE'; payload: ProjectPendingTaskSummary }
  | { type: 'TASK_UPDATE'; payload: { id: string; patch: Partial<ProjectPendingTaskSummary> } }
  | { type: 'TASK_DELETE'; payload: { id: string } }
  | { type: 'TASK_MOVE'; payload: { id: string; phaseId: string | null } }
  | { type: 'NOTE_SEND'; payload: ProjectNote }
  | { type: 'NOTE_REPLY'; payload: ProjectNote }

// ─── Reducer ─────────────────────────────────────────────────────────────────

const INITIAL_STATE: WorkspaceState = { phases: [], tasks: [], notes: [] }

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'WORKSPACE_INIT':
      return action.payload

    case 'WORKSPACE_RESET':
      return INITIAL_STATE

    case 'PHASE_CREATE':
      return { ...state, phases: [...state.phases, action.payload] }

    case 'PHASE_UPDATE':
      return {
        ...state,
        phases: state.phases.map((phase) =>
          phase.id === action.payload.id ? { ...phase, ...action.payload.patch } : phase,
        ),
      }

    case 'PHASE_DELETE':
      return {
        ...state,
        phases: state.phases.filter((phase) => phase.id !== action.payload.id),
      }

    case 'PHASE_REORDER': {
      const orderMap = new Map(action.payload.orderedIds.map((id, index) => [id, index]))
      return {
        ...state,
        phases: [...state.phases].sort(
          (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
        ),
      }
    }

    case 'TASK_CREATE':
      return { ...state, tasks: [...state.tasks, action.payload] }

    case 'TASK_UPDATE':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id ? { ...task, ...action.payload.patch } : task,
        ),
      }

    case 'TASK_DELETE':
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload.id),
      }

    case 'TASK_MOVE':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id ? { ...task, phaseId: action.payload.phaseId } : task,
        ),
      }

    case 'NOTE_SEND':
    case 'NOTE_REPLY':
      return { ...state, notes: [...state.notes, action.payload] }

    default:
      return state
  }
}
