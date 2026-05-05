import { ProjectsRepository } from '../../src/projects/projects.repository'

// ─── D.4 — createOnboardingProject() structure ──────────────────────────────

describe('ProjectsRepository.createOnboardingProject()', () => {
  afterEach(() => jest.clearAllMocks())

  function buildTxMock() {
    let phaseCallCount = 0

    const phase1 = { id: 'phase-1' }
    const phase2 = { id: 'phase-2' }
    const task1 = { id: 'task-1' }
    const task2 = { id: 'task-2' }

    return {
      project: {
        create: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Optimización operativa - Test Co' }),
      },
      phase: {
        create: jest.fn().mockImplementation(() => {
          phaseCallCount++
          return Promise.resolve(phaseCallCount === 1 ? phase1 : phase2)
        }),
      },
      task: {
        create: jest.fn()
          .mockResolvedValueOnce(task1)
          .mockResolvedValueOnce(task2),
      },
      taskChecklistItem: {
        createMany: jest.fn().mockResolvedValue({ count: 9 }),
      },
      _getPhaseCallCount: () => phaseCallCount,
    }
  }

  it('D.4: should create 1 project, 2 phases, 2 tasks, and exactly 9 checklist items', async () => {
    const prisma = { ticket: { groupBy: jest.fn() } }
    const repository = new ProjectsRepository(prisma as never)
    const tx = buildTxMock()

    const result = await repository.createOnboardingProject(tx as never, {
      companyId: 'c-1',
      companyName: 'Test Co',
      projectLeadId: 'u-1',
    })

    // 1 project created
    expect(tx.project.create).toHaveBeenCalledTimes(1)
    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: expect.stringContaining('Test Co'),
          companyId: 'c-1',
          projectLeadId: 'u-1',
        }),
      }),
    )

    // 2 phases created
    expect(tx.phase.create).toHaveBeenCalledTimes(2)

    // First phase: status completada
    const phase1Call = tx.phase.create.mock.calls[0]?.[0]
    expect(phase1Call).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completada' }),
      }),
    )

    // Second phase: status desarrollo
    const phase2Call = tx.phase.create.mock.calls[1]?.[0]
    expect(phase2Call).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'desarrollo' }),
      }),
    )

    // 2 tasks created
    expect(tx.task.create).toHaveBeenCalledTimes(2)

    // Exactly 9 checklist items in the data array
    expect(tx.taskChecklistItem.createMany).toHaveBeenCalledTimes(1)
    const createManyCall = tx.taskChecklistItem.createMany.mock.calls[0]?.[0]
    expect(createManyCall.data).toHaveLength(9)

    // Returns the project
    expect(result.id).toBe('proj-1')
  })
})
