import { Injectable } from '@nestjs/common'
import type { Phase, Prisma, Project, Task } from '@prisma/client'
import { PhaseStatus, Priority, ProjectStatus, TaskStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

const PROJECT_WITH_STATS = {
  include: {
    company: { select: { id: true, name: true } },
    phases: {
      where: { deletedAt: null },
      orderBy: { order: 'asc' as const },
    },
    tasks: {
      where: { deletedAt: null },
      include: { checklist: true },
    },
  },
} satisfies Prisma.ProjectDefaultArgs

export type ProjectWithStats = Prisma.ProjectGetPayload<typeof PROJECT_WITH_STATS>

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByCompanyIds(companyIds: string[]): Promise<ProjectWithStats[]> {
    return this.prisma.project.findMany({
      where: {
        companyId: { in: companyIds },
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      ...PROJECT_WITH_STATS,
    })
  }

  async findByIdWithStats(projectId: string, accessibleCompanyIds: string[]): Promise<ProjectWithStats | null> {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: { in: accessibleCompanyIds },
        deletedAt: null,
      },
      ...PROJECT_WITH_STATS,
    })
  }

  async findNamesByIds(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    if (ids.length === 0) return []
    return this.prisma.project.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true },
    })
  }

  async findNotesForProject(projectId: string) {
    return this.prisma.projectNote.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createNote(data: {
    projectId: string
    authorId: string
    body: string
    phaseId?: string | null
    parentId?: string | null
  }) {
    return this.prisma.projectNote.create({
      data: {
        projectId: data.projectId,
        authorId: data.authorId,
        body: data.body,
        phaseId: data.phaseId ?? null,
        parentId: data.parentId ?? null,
      },
    })
  }

  async create(data: {
    companyId: string
    name: string
    description: string
    phases: Array<{ name: string; order: number; isClientVisible: boolean }>
  }) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { companyId: data.companyId, name: data.name, description: data.description },
      })

      if (data.phases.length > 0) {
        await tx.phase.createMany({
          data: data.phases.map((phase) => ({
            projectId: project.id,
            companyId: data.companyId,
            name: phase.name,
            order: phase.order,
            isClientVisible: phase.isClientVisible,
          })),
        })
      }

      return project
    })
  }

  // ─── Atomic InTx building blocks (used by ProjectsService.createProjectInTx) ──

  async createProjectRecordInTx(
    tx: Prisma.TransactionClient,
    data: { name: string; companyId: string; projectLeadId: string; status: ProjectStatus },
  ): Promise<Project> {
    return tx.project.create({
      data: {
        name: data.name,
        companyId: data.companyId,
        projectLeadId: data.projectLeadId,
        status: data.status,
      },
    })
  }

  async createPhaseRecordInTx(
    tx: Prisma.TransactionClient,
    data: {
      name: string
      order: number
      status: PhaseStatus
      completedAt?: Date | null
      dueAt?: Date | null
      projectId: string
      companyId: string
      isClientVisible: boolean
    },
  ): Promise<Phase> {
    return tx.phase.create({
      data: {
        name: data.name,
        order: data.order,
        status: data.status,
        completedAt: data.completedAt ?? null,
        dueAt: data.dueAt ?? null,
        projectId: data.projectId,
        companyId: data.companyId,
        isClientVisible: data.isClientVisible,
      },
    })
  }

  async createTaskRecordInTx(
    tx: Prisma.TransactionClient,
    data: {
      title: string
      projectId: string
      companyId: string
      phaseId: string
      status: TaskStatus
      priority: Priority
      visibleToClient: boolean
    },
  ): Promise<Task> {
    return tx.task.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        companyId: data.companyId,
        phaseId: data.phaseId,
        status: data.status,
        priority: data.priority,
        visibleToClient: data.visibleToClient,
      },
    })
  }

  async createChecklistItemsBulkInTx(
    tx: Prisma.TransactionClient,
    taskId: string,
    labels: string[],
  ): Promise<void> {
    if (labels.length === 0) return
    await tx.taskChecklistItem.createMany({
      data: labels.map((label) => ({ taskId, label })),
    })
  }

  // ─── Phase CRUD ───────────────────────────────────────────────────────────────

  async createPhase(data: {
    projectId: string
    companyId: string
    name: string
    order: number
    startsAt?: string | null
    dueAt?: string | null
    milestone?: string | null
    isClientVisible?: boolean
  }) {
    return this.prisma.phase.create({
      data: {
        projectId: data.projectId,
        companyId: data.companyId,
        name: data.name,
        order: data.order,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        milestone: data.milestone ?? null,
        isClientVisible: data.isClientVisible ?? true,
      },
    })
  }

  async updatePhase(phaseId: string, data: {
    name?: string
    status?: PhaseStatus
    startsAt?: string | null
    dueAt?: string | null
    milestone?: string | null
    blocker?: string | null
    isClientVisible?: boolean
  }) {
    return this.prisma.phase.update({
      where: { id: phaseId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isClientVisible !== undefined && { isClientVisible: data.isClientVisible }),
        ...(data.milestone !== undefined && { milestone: data.milestone }),
        ...(data.blocker !== undefined && { blocker: data.blocker }),
        ...(data.startsAt !== undefined && {
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
        }),
        ...(data.dueAt !== undefined && {
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
        }),
      },
    })
  }

  async deletePhase(phaseId: string) {
    return this.prisma.phase.update({
      where: { id: phaseId },
      data: { deletedAt: new Date() },
    })
  }

  async reorderPhases(projectId: string, orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.phase.update({
          where: { id, projectId },
          data: { order: index + 1 },
        }),
      ),
    )
  }

  // ─── Task CRUD ────────────────────────────────────────────────────────────────

  async createTask(data: {
    projectId: string
    companyId: string
    phaseId?: string | null
    title: string
    priority?: Priority
    assigneeUserId?: string | null
    dueAt?: string | null
    visibleToClient?: boolean
  }) {
    return this.prisma.task.create({
      data: {
        projectId: data.projectId,
        companyId: data.companyId,
        phaseId: data.phaseId ?? null,
        title: data.title,
        priority: data.priority ?? Priority.media,
        assigneeUserId: data.assigneeUserId ?? null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        visibleToClient: data.visibleToClient ?? false,
      },
      include: { checklist: true },
    })
  }

  async updateTask(taskId: string, data: {
    title?: string
    status?: TaskStatus
    priority?: Priority
    phaseId?: string | null
    assigneeUserId?: string | null
    dueAt?: string | null
    visibleToClient?: boolean
  }) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.phaseId !== undefined && { phaseId: data.phaseId }),
        ...(data.assigneeUserId !== undefined && { assigneeUserId: data.assigneeUserId }),
        ...(data.visibleToClient !== undefined && { visibleToClient: data.visibleToClient }),
        ...(data.dueAt !== undefined && { dueAt: data.dueAt ? new Date(data.dueAt) : null }),
      },
      include: { checklist: true },
    })
  }

  async deleteTask(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    })
  }
}
