import {
  getProjectHealthFromTasks,
  getProjectWorkspaceTabs,
  resolveProjectWorkspaceTab,
  selectCanonicalProjectContext,
} from '@/features/projects/lib/project-selectors'
import type { ProjectPendingTaskSummary } from '@/lib/types'

function makeTask(overrides: Partial<ProjectPendingTaskSummary> = {}): ProjectPendingTaskSummary {
  return {
    id: 'task-1',
    projectId: 'proj-1',
    phaseId: 'phase-1',
    title: 'Task',
    status: 'pendiente',
    completionType: null,
    priority: 'media',
    assigneeUserId: 'user-1',
    assigneeName: null,
    dueAt: new Date('2026-04-01T10:00:00Z'),
    dueState: 'on-track',
    dependencyTaskId: null,
    blockReason: null,
    resolutionNote: null,
    visibleToClient: false,
    checklist: [],
    ...overrides,
  }
}

describe('project-selectors', () => {
  it('prioritizes breached and at-risk health over on-track tasks', () => {
    expect(getProjectHealthFromTasks([makeTask({ dueState: 'breached' })])).toBe('breached')
    expect(getProjectHealthFromTasks([makeTask({ dueState: 'at-risk' })])).toBe('at-risk')
    expect(getProjectHealthFromTasks([makeTask({ dueState: 'on-track' })])).toBe('on-track')
  })

  it('ignores completed or no-deadline tasks for SLA health', () => {
    expect(
      getProjectHealthFromTasks([
        makeTask({ status: 'completada', dueState: 'breached' }),
        makeTask({ id: 'task-2', dueState: 'no-deadline' }),
      ]),
    ).toBeNull()
  })

  it('returns shared tabs for clients and all tabs for internal roles', () => {
    expect(getProjectWorkspaceTabs('ACCOUNT_OWNER').map((tab) => tab.id)).toEqual([
      'plan',
      'tickets',
      'activity',
    ])

    expect(getProjectWorkspaceTabs('PROJECT_LEAD').map((tab) => tab.id)).toEqual([
      'plan',
      'tickets',
      'activity',
      'team_notes',
    ])
  })

  it('falls back to the first allowed workspace tab when the requested tab is forbidden', () => {
    expect(resolveProjectWorkspaceTab('ACCOUNT_OWNER', 'team_notes')).toBe('plan')
    expect(resolveProjectWorkspaceTab('ACCOUNT_OWNER', 'phases')).toBe('plan')
    expect(resolveProjectWorkspaceTab('PROJECT_LEAD', 'team_notes')).toBe('team_notes')
  })

  it('keeps canonical metadata stable without mutating the source object', () => {
    const project = {
      id: 'proj-1',
      companyId: 'comp-1',
      companyName: 'Aiderbrand',
      name: 'Portal de Clientes',
      description: 'Workspace único',
      status: 'desarrollo' as const,
      currentPhase: 'QA y estabilización',
      progressPct: 62,
      targetLaunchAt: new Date('2026-04-18T09:00:00Z'),
      updatedAt: new Date('2026-03-28T16:30:00Z'),
      createdAt: new Date('2026-01-20T09:00:00Z'),
    }

    const selected = selectCanonicalProjectContext(project)

    expect(selected).toEqual(project)
    expect(selected).not.toBe(project)
  })
})
