import {
  Body,
  Controller,
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
import type { Priority, TicketStatus } from '@prisma/client'
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
import { TicketsService } from './tickets.service'
import {
  AddCommentDto,
  AssignTicketDto,
  ChangeStatusDto,
  CreateTicketDto,
  UpdateTicketDto,
} from './dto/create-ticket.dto'

@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get('tickets')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async list(
    @Query('companyIds') companyIdsParam: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @Query('status') statusParam: string | undefined,
    @Query('priority') priorityParam: string | undefined,
    @Query('assignedToId') assignedToId: string | undefined,
    @Query('q') search: string | undefined,
    @AuthContext() authContext: AuthContextData,
  ) {
    const requestedCompanyIds = this.parseIds(companyIdsParam)
    const accessibleIds = authContext.actorScope.realDataCompanyIds
    const companyIds = requestedCompanyIds.length > 0
      ? requestedCompanyIds.filter((id) => accessibleIds.includes(id))
      : accessibleIds

    return this.ticketsService.list({
      companyIds,
      projectId: projectId ?? undefined,
      status: statusParam ? (statusParam.split(',') as TicketStatus[]) : undefined,
      priority: priorityParam ? (priorityParam.split(',') as Priority[]) : undefined,
      assignedToId: assignedToId ?? undefined,
      search: search ?? undefined,
    })
  }

  // ─── Get by ID ────────────────────────────────────────────────────────────

  @Get('tickets/:ticketId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async getById(
    @Param('ticketId') ticketId: string,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.ticketsService.getById(
      ticketId,
      authContext.actorScope.realDataCompanyIds,
    )
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post('companies/:companyId/tickets')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(
    Role.SYSTEM_ADMIN,
    Role.PROJECT_LEAD,
    Role.DELIVERY_SPECIALIST,
    Role.ACCOUNT_OWNER,
    Role.COLLABORATOR,
  )
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.ticketsService.create({
      companyId,
      actorId: currentUser.sub,
      title: dto.title,
      description: dto.description ?? '',
      priority: dto.priority,
      projectId: dto.projectId ?? null,
    })
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch('tickets/:ticketId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async update(
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketDto,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.ticketsService.update(
      ticketId,
      authContext.actorScope.realDataCompanyIds,
      {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        projectId: dto.projectId,
      },
    )
  }

  // ─── Change status ────────────────────────────────────────────────────────

  @Patch('tickets/:ticketId/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async changeStatus(
    @Param('ticketId') ticketId: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.ticketsService.changeStatus(
      ticketId,
      dto.status as TicketStatus,
      currentUser.sub,
      authContext.actorScope.realDataCompanyIds,
    )
  }

  // ─── Assign ───────────────────────────────────────────────────────────────

  @Patch('tickets/:ticketId/assignee')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async assign(
    @Param('ticketId') ticketId: string,
    @Body() dto: AssignTicketDto,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.ticketsService.assignTicket(
      ticketId,
      dto.assigneeId,
      authContext.actorScope.realDataCompanyIds,
    )
  }

  // ─── Add comment ──────────────────────────────────────────────────────────

  @Post('tickets/:ticketId/comments')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  async addComment(
    @Param('ticketId') ticketId: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ) {
    return this.ticketsService.addComment(
      ticketId,
      dto.content,
      dto.type ?? 'public',
      currentUser.sub,
      authContext.actorScope.realDataCompanyIds,
    )
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private parseIds(raw: string | undefined): string[] {
    if (!raw) return []
    return raw.split(',').map((id) => id.trim()).filter(Boolean)
  }
}
