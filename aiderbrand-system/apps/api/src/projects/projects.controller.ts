import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import {
  AllowInternalCrossCompany,
  AuthContext,
  CurrentUser,
  OptionalCompanyScope,
  RequireRoles,
} from '../common/decorators'
import { Role } from '../common/enums/role.enum'
import type { JwtPayload } from '../common/types/jwt-payload.type'
import type { AuthContextData } from '../common/types'
import { ProjectsService } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { CreatePhaseDto } from './dto/create-phase.dto'
import { UpdatePhaseDto } from './dto/update-phase.dto'
import { ReorderPhasesDto } from './dto/reorder-phases.dto'
import { CreateNoteDto } from './dto/create-note.dto'

@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ─── Hub ──────────────────────────────────────────────────────────────────────

  @Get('projects/hub')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async getHub(
    @Query('companyIds') companyIdsParam: string | undefined,
    @AuthContext() authContext: AuthContextData,
  ) {
    const requestedCompanyIds = this.parseCompanyIds(companyIdsParam)

    return this.projectsService.getHub({
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
      requestedCompanyIds,
    })
  }

  // ─── List for company ─────────────────────────────────────────────────────────

  @Get('companies/:companyId/projects')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(
    Role.SYSTEM_ADMIN,
    Role.PROJECT_LEAD,
    Role.DELIVERY_SPECIALIST,
    Role.ACCOUNT_OWNER,
    Role.COLLABORATOR,
  )
  async listForCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @AuthContext() authContext: AuthContextData,
  ) {
    const result = await this.projectsService.getHub({
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
      requestedCompanyIds: [companyId],
    })

    return result.items
  }

  // ─── Create project ───────────────────────────────────────────────────────────

  @Post('companies/:companyId/projects')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.projectsService.create({
      companyId,
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      name: dto.name,
      description: dto.description ?? '',
    })
  }

  // ─── Workspace ────────────────────────────────────────────────────────────────

  @Get('projects/:projectId/workspace')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async getWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.projectsService.getWorkspace({
      projectId,
      actorRole: authContext.effectiveRole as Role,
      currentUserId: currentUser.sub,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
    })
  }

  // ─── Create phase ─────────────────────────────────────────────────────────────

  @Post('projects/:projectId/phases')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.DELIVERY_SPECIALIST)
  async createPhase(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePhaseDto,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.projectsService.createPhase({
      projectId,
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
      dto,
    })
  }

  // ─── Reorder phases (must come before /:phaseId to avoid routing conflict) ────

  @Patch('projects/:projectId/phases/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.DELIVERY_SPECIALIST)
  async reorderPhases(
    @Param('projectId') projectId: string,
    @Body() dto: ReorderPhasesDto,
    @AuthContext() authContext: AuthContextData,
  ) {
    await this.projectsService.reorderPhases({
      projectId,
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
      orderedIds: dto.orderedIds,
    })
  }

  // ─── Update phase ─────────────────────────────────────────────────────────────

  @Patch('projects/:projectId/phases/:phaseId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.DELIVERY_SPECIALIST)
  async updatePhase(
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseDto,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.projectsService.updatePhase({
      projectId,
      phaseId,
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
      dto,
    })
  }

  // ─── Delete phase ─────────────────────────────────────────────────────────────

  @Delete('projects/:projectId/phases/:phaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.DELIVERY_SPECIALIST)
  async deletePhase(
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @AuthContext() authContext: AuthContextData,
  ) {
    await this.projectsService.deletePhase({
      projectId,
      phaseId,
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
    })
  }

  // ─── Create note ──────────────────────────────────────────────────────────────

  @Post('projects/:projectId/notes')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.DELIVERY_SPECIALIST)
  async createNote(
    @Param('projectId') projectId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.projectsService.createNote({
      projectId,
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      accessibleCompanyIds: authContext.actorScope.realDataCompanyIds,
      dto,
    })
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private parseCompanyIds(raw: string | undefined): string[] {
    if (!raw) return []
    return raw.split(',').map((id) => id.trim()).filter(Boolean)
  }
}
