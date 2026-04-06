import { Injectable } from '@nestjs/common'
import type { Prisma, ProjectStatus } from '@prisma/client'
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
    _count: {
      select: {
        tickets: { where: { deletedAt: null } },
      },
    },
  },
} satisfies Prisma.ProjectDefaultArgs

type ProjectWithStats = Prisma.ProjectGetPayload<typeof PROJECT_WITH_STATS> & {
  openTicketCount: number
}

const TEMPLATE_PHASES = [
  { name: 'Kick-off', order: 1 },
  { name: 'Diseño', order: 2 },
  { name: 'Desarrollo', order: 3 },
  { name: 'Testing', order: 4 },
  { name: 'Lanzamiento', order: 5 },
]

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByCompanyIds(companyIds: string[]): Promise<ProjectWithStats[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        companyId: { in: companyIds },
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      ...PROJECT_WITH_STATS,
    })

    return this.enrichWithOpenTickets(projects)
  }

  async findByIdWithStats(projectId: string, accessibleCompanyIds: string[]): Promise<ProjectWithStats | null> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: { in: accessibleCompanyIds },
        deletedAt: null,
      },
      ...PROJECT_WITH_STATS,
    })

    if (!project) return null

    const [enriched] = await this.enrichWithOpenTickets([project])
    return enriched ?? null
  }

  async findTicketsForProject(projectId: string) {
    return this.prisma.ticket.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, title: true, status: true, priority: true },
      orderBy: { createdAt: 'desc' },
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
    actorId: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          description: data.description,
        },
      })

      await tx.phase.createMany({
        data: TEMPLATE_PHASES.map((tmpl) => ({
          projectId: project.id,
          companyId: data.companyId,
          name: tmpl.name,
          order: tmpl.order,
          isClientVisible: true,
        })),
      })

      await tx.auditLog.create({
        data: {
          actorId: data.actorId,
          companyId: data.companyId,
          action: 'project.created',
          entityType: 'Project',
          entityId: project.id,
          metadata: { name: data.name },
        },
      })

      return project
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
    status?: string
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
        ...(data.status !== undefined && { status: data.status as never }),
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

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async enrichWithOpenTickets(
    projects: Prisma.ProjectGetPayload<typeof PROJECT_WITH_STATS>[],
  ): Promise<ProjectWithStats[]> {
    if (projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)
    const openTicketCounts = await this.prisma.ticket.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        status: { notIn: ['cerrado'] },
        deletedAt: null,
      },
      _count: { id: true },
    })

    const openCountMap = new Map(
      openTicketCounts.map((row) => [row.projectId, row._count.id]),
    )

    return projects.map((p) => ({
      ...p,
      openTicketCount: openCountMap.get(p.id) ?? 0,
    }))
  }

  resolveProjectStatus(status: ProjectStatus): 'active' | 'paused' | 'done' {
    if (status === 'pausado') return 'paused'
    if (status === 'finalizado') return 'done'
    return 'active'
  }
}
