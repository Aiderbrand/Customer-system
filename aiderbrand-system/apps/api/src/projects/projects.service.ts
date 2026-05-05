import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { PhaseStatus, Priority, ProjectStatus, TaskStatus, TicketStatus } from '@prisma/client'
import type { Phase, Prisma, Project, Task, TaskChecklistItem } from '@prisma/client'
import { Role } from '../common/enums/role.enum'
import { AuditService } from '../audit/audit.service'
import { UsersRepository } from '../users/users.repository'
import { TicketsService } from '../tickets/tickets.service'
import { ProjectsRepository } from './projects.repository'
import type {
  PhaseSummaryDto,
  ProjectAdminDto,
  ProjectAudience,
  ProjectHealthStatus,
  ProjectHubItemDto,
  ProjectHubResponseDto,
  ProjectNoteDto,
  ProjectWorkspaceResponseDto,
  TaskSummaryDto,
} from './dto/project-response.dto'
import type { CreatePhaseDto } from './dto/create-phase.dto'
import type { UpdatePhaseDto } from './dto/update-phase.dto'
import type { CreateNoteDto } from './dto/create-note.dto'
import type { CreateTaskDto } from './dto/create-task.dto'
import type { UpdateTaskDto } from './dto/update-task.dto'

const INTERNAL_ROLES = new Set<Role>([
  Role.SYSTEM_ADMIN,
  Role.PROJECT_LEAD,
  Role.DELIVERY_SPECIALIST,
])

const PROJECT_CREATOR_ROLES = new Set<Role>([Role.SYSTEM_ADMIN, Role.PROJECT_LEAD])

const DEFAULT_PHASE_NAMES = ['Kick-off', 'Diseño', 'Desarrollo', 'Testing', 'Lanzamiento']

type TaskWithChecklist = Task & { checklist: TaskChecklistItem[] }

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name)

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly ticketsService: TicketsService,
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async findNamesByIds(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    return this.projectsRepository.findNamesByIds(ids)
  }

  async getHub(params: {
    actorRole: Role
    accessibleCompanyIds: string[]
    requestedCompanyIds: string[]
  }): Promise<ProjectHubResponseDto> {
    const audience = this.resolveAudience(params.actorRole)
    const scopedIds = this.intersectCompanyIds(
      params.accessibleCompanyIds,
      params.requestedCompanyIds,
    )

    if (scopedIds.length === 0) {
      return this.emptyHub(audience)
    }

    const projects = await this.projectsRepository.findManyByCompanyIds(scopedIds)
    const projectIds = projects.map((p) => p.id)

    const [totalCountMap, openCountMap] = await Promise.all([
      this.ticketsService.countByProjectIds(projectIds),
      this.ticketsService.countByProjectIds(projectIds, { excludeStatuses: [TicketStatus.cerrado] }),
    ])

    const items: ProjectHubItemDto[] = projects.map((project) => {
      const visiblePhases = this.getVisiblePhases(project.phases, audience)
      const health = audience === 'internal'
        ? this.computeHealth(project.tasks)
        : null

      return {
        id: project.id,
        companyId: project.companyId,
        companyName: project.company?.name ?? null,
        name: project.name,
        description: project.description,
        status: project.status,
        currentPhase: this.resolveCurrentPhase(visiblePhases),
        progressPct: this.resolveProgressPct(visiblePhases),
        targetLaunchAt: project.targetLaunchAt?.toISOString() ?? null,
        updatedAt: project.updatedAt.toISOString(),
        createdAt: project.createdAt.toISOString(),
        ticketCount: totalCountMap.get(project.id) ?? 0,
        openTicketCount: openCountMap.get(project.id) ?? 0,
        nextMilestone: this.resolveNextMilestone(visiblePhases),
        health,
        phases: visiblePhases.map((phase) => this.toPhaseSummaryDto(phase)),
      }
    })

    const summary = {
      totalProjects: items.length,
      activeProjects: items.filter(
        (item) => item.status !== ProjectStatus.finalizado && item.status !== ProjectStatus.pausado,
      ).length,
      pausedProjects: items.filter((item) => item.status === ProjectStatus.pausado).length,
      projectsWithOpenTickets: items.filter((item) => item.openTicketCount > 0).length,
      projectsAtRisk: audience === 'internal'
        ? items.filter((item) => item.health === 'at-risk' || item.health === 'breached').length
        : null,
    }

    return { audience, summary, items }
  }

  async getWorkspace(params: {
    projectId: string
    actorRole: Role
    currentUserId: string | null
    accessibleCompanyIds: string[]
  }): Promise<ProjectWorkspaceResponseDto> {
    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )

    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }

    const audience = this.resolveAudience(params.actorRole)
    const visiblePhases = this.getVisiblePhases(project.phases, audience)
    const visibleTasks = this.getVisibleTasks(project.tasks, audience)
    const health = audience === 'internal' ? this.computeHealth(project.tasks) : null
    const [openCountMap, projectTickets, notes] = await Promise.all([
      this.ticketsService.countByProjectIds([params.projectId], { excludeStatuses: [TicketStatus.cerrado] }),
      this.ticketsService.findSummaryByProjectId(params.projectId),
      audience === 'internal' ? this.projectsRepository.findNotesForProject(params.projectId) : Promise.resolve([]),
    ])

    // Batch-resolve user names for all user-id references in the workspace
    const userIds = [...new Set([
      ...visiblePhases.map((p) => p.ownerUserId).filter(Boolean),
      ...project.tasks.map((t) => t.assigneeUserId).filter(Boolean),
      ...(audience === 'internal' ? [project.projectLeadId, project.deliveryOwnerId].filter(Boolean) : []),
      ...(audience === 'internal' ? notes.map((n) => n.authorId) : []),
    ])] as string[]
    const resolvedUsers = await this.usersRepository.findManyByIds(userIds)
    const userMap = new Map(resolvedUsers.map((u) => [u.id, u.name]))

    const workspaceProject = {
      id: project.id,
      companyId: project.companyId,
      companyName: project.company?.name ?? null,
      name: project.name,
      description: project.description,
      status: project.status,
      currentPhase: this.resolveCurrentPhase(visiblePhases),
      progressPct: this.resolveProgressPct(visiblePhases),
      targetLaunchAt: project.targetLaunchAt?.toISOString() ?? null,
      updatedAt: project.updatedAt.toISOString(),
      createdAt: project.createdAt.toISOString(),
    }

    const summary = {
      openTickets: openCountMap.get(params.projectId) ?? 0,
      visiblePhases: visiblePhases.length,
      nextMilestone: this.resolveNextMilestone(visiblePhases),
      health,
    }

    const result: ProjectWorkspaceResponseDto = {
      audience,
      project: workspaceProject,
      summary,
      phases: visiblePhases.map((phase) => this.toPhaseSummaryDto(phase, userMap, audience === 'client')),
      tasks: visibleTasks.map((task) => this.toTaskSummaryDto(task, userMap)),
      tickets: projectTickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
      })),
      activity: [],
    }

    if (audience === 'internal') {
      const admin: ProjectAdminDto = {
        projectLeadId: project.projectLeadId ?? null,
        projectLeadName: project.projectLeadId ? (userMap.get(project.projectLeadId) ?? null) : null,
        deliveryOwnerId: project.deliveryOwnerId ?? null,
        deliveryOwnerName: project.deliveryOwnerId ? (userMap.get(project.deliveryOwnerId) ?? null) : null,
        targetLaunchAt: project.targetLaunchAt?.toISOString() ?? null,
        lastUpdatedAt: project.updatedAt.toISOString(),
        isDependencyReady: project.isDependencyReady,
      }

      result.internal = {
        tasks: project.tasks.map((task) => this.toTaskSummaryDto(task, userMap)),
        notes: notes.map((note): ProjectNoteDto => ({
          id: note.id,
          projectId: note.projectId,
          phaseId: note.phaseId ?? null,
          authorId: note.authorId,
          authorName: userMap.get(note.authorId) ?? 'Usuario desconocido',
          body: note.body,
          parentId: note.parentId ?? null,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        })),
        admin,
      }
    }

    return result
  }

  async create(params: {
    companyId: string
    actorId: string
    actorRole: Role
    name: string
    description: string
  }) {
    if (!PROJECT_CREATOR_ROLES.has(params.actorRole)) {
      throw new ForbiddenException(`Role ${params.actorRole} cannot create projects`)
    }

    const trimmedName = params.name.trim()
    if (!trimmedName) {
      throw new BadRequestException('Project name is required')
    }

    const phases = DEFAULT_PHASE_NAMES.map((name, index) => ({
      name,
      order: index + 1,
      isClientVisible: true,
    }))

    const project = await this.projectsRepository.create({
      companyId: params.companyId,
      name: trimmedName,
      description: params.description?.trim() ?? '',
      phases,
    })

    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: params.companyId,
        action: 'project.created',
        entityType: 'Project',
        entityId: project.id,
        metadata: { name: trimmedName },
      })
      .catch((err) => this.logger.error('Audit log failed on project.created', err))

    return project
  }

  // ─── Phase Management ─────────────────────────────────────────────────────────

  async createPhase(params: {
    projectId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
    dto: CreatePhaseDto
  }): Promise<PhaseSummaryDto> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede crear fases')
    }

    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )

    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }

    const nextOrder = project.phases.length + 1

    const phase = await this.projectsRepository.createPhase({
      projectId: params.projectId,
      companyId: project.companyId,
      name: params.dto.name.trim(),
      order: nextOrder,
      startsAt: params.dto.startsAt,
      dueAt: params.dto.dueAt,
      milestone: params.dto.milestone,
      isClientVisible: params.dto.isClientVisible ?? true,
    })

    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.phase.created',
        entityType: 'Phase',
        entityId: phase.id,
        metadata: { projectId: params.projectId, name: phase.name, order: phase.order },
      })
      .catch((err) => this.logger.error('Audit log failed on project.phase.created', err))

    return this.toPhaseSummaryDto(phase)
  }

  async updatePhase(params: {
    projectId: string
    phaseId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
    dto: UpdatePhaseDto
  }): Promise<PhaseSummaryDto> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede editar fases')
    }

    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )

    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }

    const phase = project.phases.find((p) => p.id === params.phaseId)
    if (!phase) {
      throw new NotFoundException(`Phase ${params.phaseId} not found`)
    }

    const updated = await this.projectsRepository.updatePhase(params.phaseId, {
      name: params.dto.name,
      status: params.dto.status,
      startsAt: params.dto.startsAt,
      dueAt: params.dto.dueAt,
      milestone: params.dto.milestone,
      blocker: params.dto.blocker,
      isClientVisible: params.dto.isClientVisible,
    })

    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.phase.updated',
        entityType: 'Phase',
        entityId: params.phaseId,
        metadata: {
          projectId: params.projectId,
          updatedFields: Object.keys(params.dto).filter((k) => params.dto[k as keyof typeof params.dto] !== undefined),
        },
      })
      .catch((err) => this.logger.error('Audit log failed on project.phase.updated', err))

    return this.toPhaseSummaryDto(updated)
  }

  async deletePhase(params: {
    projectId: string
    phaseId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
  }): Promise<void> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede eliminar fases')
    }

    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )

    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }

    const phase = project.phases.find((p) => p.id === params.phaseId)
    if (!phase) {
      throw new NotFoundException(`Phase ${params.phaseId} not found`)
    }

    await this.projectsRepository.deletePhase(params.phaseId)

    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.phase.deleted',
        entityType: 'Phase',
        entityId: params.phaseId,
        metadata: { projectId: params.projectId, name: phase.name },
      })
      .catch((err) => this.logger.error('Audit log failed on project.phase.deleted', err))
  }

  async createNote(params: {
    projectId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
    dto: CreateNoteDto
  }): Promise<ProjectNoteDto> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede agregar notas')
    }

    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )

    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }

    const note = await this.projectsRepository.createNote({
      projectId: params.projectId,
      authorId: params.actorId,
      body: params.dto.body.trim(),
      phaseId: params.dto.phaseId ?? null,
      parentId: params.dto.parentId ?? null,
    })

    void this.auditService.logSafe({
      actorId: params.actorId,
      companyId: project.companyId,
      action: 'project.note.created',
      entityType: 'Project',
      entityId: params.projectId,
      metadata: { phaseId: params.dto.phaseId ?? null },
    })

    const [author] = await this.usersRepository.findManyByIds([params.actorId])

    return {
      id: note.id,
      projectId: note.projectId,
      phaseId: note.phaseId ?? null,
      authorId: note.authorId,
      authorName: author?.name ?? 'Usuario desconocido',
      body: note.body,
      parentId: note.parentId ?? null,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }
  }

  async reorderPhases(params: {
    projectId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
    orderedIds: string[]
  }): Promise<void> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede reordenar fases')
    }

    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )

    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }

    await this.projectsRepository.reorderPhases(params.projectId, params.orderedIds)

    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.phase.reordered',
        entityType: 'Project',
        entityId: params.projectId,
        metadata: { orderedIds: params.orderedIds },
      })
      .catch((err) => this.logger.error('Audit log failed on project.phase.reordered', err))
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private resolveAudience(role: Role): ProjectAudience {
    return INTERNAL_ROLES.has(role) ? 'internal' : 'client'
  }

  private intersectCompanyIds(accessible: string[], requested: string[]): string[] {
    if (requested.length === 0) return accessible
    const accessibleSet = new Set(accessible)
    return requested.filter((id) => accessibleSet.has(id))
  }

  private emptyHub(audience: ProjectAudience): ProjectHubResponseDto {
    return {
      audience,
      summary: {
        totalProjects: 0,
        activeProjects: 0,
        pausedProjects: 0,
        projectsWithOpenTickets: 0,
        projectsAtRisk: audience === 'internal' ? 0 : null,
      },
      items: [],
    }
  }

  private getVisiblePhases(phases: Phase[], audience: ProjectAudience): Phase[] {
    const active = phases.filter((phase) => !phase.deletedAt)
    if (audience === 'client') {
      return active.filter((phase) => phase.isClientVisible)
    }
    return active
  }

  private getVisibleTasks(tasks: TaskWithChecklist[], audience: ProjectAudience): TaskWithChecklist[] {
    const active = tasks.filter((task) => !task.deletedAt)
    if (audience === 'client') {
      return active.filter((task) => task.visibleToClient)
    }
    return active
  }

  private resolveCurrentPhase(phases: Phase[]): string | null {
    const active = phases.find(
      (phase) => phase.status !== PhaseStatus.completada && phase.status !== PhaseStatus.planificacion,
    )
    return active?.name ?? phases.find((phase) => phase.status !== PhaseStatus.completada)?.name ?? null
  }

  private resolveProgressPct(phases: Phase[]): number | null {
    if (phases.length === 0) return null
    const completed = phases.filter((phase) => phase.status === PhaseStatus.completada).length
    return Math.round((completed / phases.length) * 100)
  }

  private resolveNextMilestone(phases: Phase[]): string | null {
    const future = phases.find(
      (phase) => phase.milestone && phase.status !== PhaseStatus.completada,
    )
    return future?.milestone ?? null
  }

  private computeHealth(tasks: TaskWithChecklist[]): ProjectHealthStatus | null {
    const now = new Date()
    const openTimedTasks = tasks.filter(
      (task) => !task.deletedAt && task.status !== TaskStatus.completada && task.dueAt !== null,
    )

    if (openTimedTasks.length === 0) return null

    const hasBreached = openTimedTasks.some(
      (task) => task.dueAt! < now && task.status === TaskStatus.bloqueada,
    )
    if (hasBreached) return 'breached'

    const atRiskDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const hasAtRisk = openTimedTasks.some(
      (task) => task.dueAt! <= atRiskDate && task.dueAt! >= now,
    )
    if (hasAtRisk) return 'at-risk'

    return 'on-track'
  }

  private toPhaseSummaryDto(
    phase: Phase,
    userMap: Map<string, string> = new Map(),
    hideBlocker = false,
  ): PhaseSummaryDto {
    return {
      id: phase.id,
      projectId: phase.projectId,
      name: phase.name,
      order: phase.order,
      status: phase.status,
      startsAt: phase.startsAt?.toISOString() ?? null,
      dueAt: phase.dueAt?.toISOString() ?? null,
      completedAt: phase.completedAt?.toISOString() ?? null,
      ownerUserId: phase.ownerUserId ?? null,
      ownerName: phase.ownerUserId ? (userMap.get(phase.ownerUserId) ?? null) : null,
      milestone: phase.milestone ?? null,
      blocker: hideBlocker ? null : (phase.blocker ?? null),
      isClientVisible: phase.isClientVisible,
    }
  }

  private toTaskSummaryDto(task: TaskWithChecklist, userMap: Map<string, string> = new Map()): TaskSummaryDto {
    const now = new Date()
    const dueState = this.resolveDueState(task.dueAt, task.status, now)

    return {
      id: task.id,
      projectId: task.projectId,
      phaseId: task.phaseId ?? null,
      title: task.title,
      status: task.status,
      completionType: task.completionType ?? null,
      priority: task.priority,
      assigneeUserId: task.assigneeUserId ?? null,
      assigneeName: task.assigneeUserId ? (userMap.get(task.assigneeUserId) ?? null) : null,
      dueAt: task.dueAt?.toISOString() ?? null,
      dueState,
      dependencyTaskId: task.dependencyTaskId ?? null,
      blockReason: task.blockReason ?? null,
      resolutionNote: task.resolutionNote ?? null,
      visibleToClient: task.visibleToClient,
      checklist: task.checklist.map((item) => ({
        id: item.id,
        label: item.label,
        done: item.done,
      })),
    }
  }

  private resolveDueState(
    dueAt: Date | null,
    status: string,
    now: Date,
  ): 'on-track' | 'at-risk' | 'breached' | 'no-deadline' {
    if (!dueAt) return 'no-deadline'
    if (status === TaskStatus.completada) return 'on-track'
    if (dueAt < now) return 'breached'
    const atRiskDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    if (dueAt <= atRiskDate) return 'at-risk'
    return 'on-track'
  }

  // ─── Task CRUD ────────────────────────────────────────────────────────────────

  async createTask(params: {
    projectId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
    dto: CreateTaskDto
  }): Promise<TaskSummaryDto> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede crear tareas')
    }
    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )
    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }
    const task = await this.projectsRepository.createTask({
      projectId: params.projectId,
      companyId: project.companyId,
      phaseId: params.dto.phaseId ?? null,
      title: params.dto.title.trim(),
      priority: params.dto.priority,
      assigneeUserId: params.dto.assigneeUserId ?? null,
      dueAt: params.dto.dueAt ?? null,
      visibleToClient: params.dto.visibleToClient ?? false,
    })
    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.task.created',
        entityType: 'Task',
        entityId: task.id,
        metadata: { projectId: params.projectId, title: task.title, priority: task.priority },
      })
      .catch((err) => this.logger.error('Audit log failed on project.task.created', err))
    return this.toTaskSummaryDto(task)
  }

  async updateTask(params: {
    projectId: string
    taskId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
    dto: UpdateTaskDto
  }): Promise<TaskSummaryDto> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede editar tareas')
    }
    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )
    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }
    const task = project.tasks.find((t) => t.id === params.taskId)
    if (!task) {
      throw new NotFoundException(`Task ${params.taskId} not found`)
    }
    const updated = await this.projectsRepository.updateTask(params.taskId, {
      title: params.dto.title,
      status: params.dto.status,
      priority: params.dto.priority,
      phaseId: params.dto.phaseId,
      assigneeUserId: params.dto.assigneeUserId,
      dueAt: params.dto.dueAt,
      visibleToClient: params.dto.visibleToClient,
    })
    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.task.updated',
        entityType: 'Task',
        entityId: params.taskId,
        metadata: { projectId: params.projectId, updatedFields: Object.keys(params.dto).filter((k) => params.dto[k as keyof typeof params.dto] !== undefined) },
      })
      .catch((err) => this.logger.error('Audit log failed on project.task.updated', err))
    return this.toTaskSummaryDto(updated)
  }

  async deleteTask(params: {
    projectId: string
    taskId: string
    actorId: string
    actorRole: Role
    accessibleCompanyIds: string[]
  }): Promise<void> {
    if (!INTERNAL_ROLES.has(params.actorRole)) {
      throw new ForbiddenException('Solo el equipo interno puede eliminar tareas')
    }
    const project = await this.projectsRepository.findByIdWithStats(
      params.projectId,
      params.accessibleCompanyIds,
    )
    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`)
    }
    const task = project.tasks.find((t) => t.id === params.taskId)
    if (!task) {
      throw new NotFoundException(`Task ${params.taskId} not found`)
    }
    await this.projectsRepository.deleteTask(params.taskId)
    this.auditService
      .logSafe({
        actorId: params.actorId,
        companyId: project.companyId,
        action: 'project.task.deleted',
        entityType: 'Task',
        entityId: params.taskId,
        metadata: { projectId: params.projectId },
      })
      .catch((err) => this.logger.error('Audit log failed on project.task.deleted', err))
  }

  async createProjectInTx(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string
      name: string
      projectLeadId: string
      status: ProjectStatus
      phases: Array<{
        name: string
        order: number
        status: PhaseStatus
        completedAt?: Date | null
        dueAt?: Date | null
        isClientVisible: boolean
        tasks?: Array<{
          title: string
          status: TaskStatus
          priority: Priority
          visibleToClient: boolean
          checklistItems?: string[]
        }>
      }>
    },
  ): Promise<Project> {
    const project = await this.projectsRepository.createProjectRecordInTx(tx, {
      name: data.name,
      companyId: data.companyId,
      projectLeadId: data.projectLeadId,
      status: data.status,
    })

    for (const phase of data.phases) {
      const createdPhase = await this.projectsRepository.createPhaseRecordInTx(tx, {
        name: phase.name,
        order: phase.order,
        status: phase.status,
        completedAt: phase.completedAt ?? null,
        dueAt: phase.dueAt ?? null,
        projectId: project.id,
        companyId: data.companyId,
        isClientVisible: phase.isClientVisible,
      })

      for (const task of phase.tasks ?? []) {
        const createdTask = await this.projectsRepository.createTaskRecordInTx(tx, {
          title: task.title,
          projectId: project.id,
          companyId: data.companyId,
          phaseId: createdPhase.id,
          status: task.status,
          priority: task.priority,
          visibleToClient: task.visibleToClient,
        })

        if (task.checklistItems && task.checklistItems.length > 0) {
          await this.projectsRepository.createChecklistItemsBulkInTx(tx, createdTask.id, task.checklistItems)
        }
      }
    }

    return project
  }
}
