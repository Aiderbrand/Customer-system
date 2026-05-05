import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { ValidateTokenDto } from './dto/validate-token.dto'
import type { CreateInvitationResponseDto, InvitationDto } from './dto/invitation-response.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import {
  AllowInternalCrossCompany,
  AuthContext,
  CompanyContext,
  CurrentUser,
  RequireRoles,
} from '../common/decorators'
import { PublicRateLimit } from '../common/decorators/public-rate-limit.decorator'
import { INVITE_CAPABLE_ROLES, Role as LocalRole } from '../common/enums/role.enum'
import { Role } from '@prisma/client'
import type { Invitation } from '@prisma/client'
import { PublicRateLimitGuard } from '../common/guards/public-rate-limit.guard'
import type { AuthContextData, JwtPayload } from '../common/types'

@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @RequireRoles(...INVITE_CAPABLE_ROLES)
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() currentUser: JwtPayload,
    @CompanyContext() companyId: string,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CreateInvitationResponseDto> {
    return this.createForCompany(companyId, currentUser, authContext, dto)
  }

  @Post('companies/:companyId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(LocalRole.SYSTEM_ADMIN, LocalRole.PROJECT_LEAD)
  async createForHub(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CreateInvitationResponseDto> {
    return this.createForCompany(companyId, currentUser, authContext, dto)
  }

  @Get('invitations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @RequireRoles(...INVITE_CAPABLE_ROLES)
  async list(
    @CompanyContext() companyId: string,
    @Query('status') status?: string,
  ): Promise<InvitationDto[]> {
    return this.listForCompany(companyId, status)
  }

  @Get('companies/:companyId/invitations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(LocalRole.SYSTEM_ADMIN, LocalRole.PROJECT_LEAD)
  async listForHub(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('status') status?: string,
  ): Promise<InvitationDto[]> {
    return this.listForCompany(companyId, status)
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @RequireRoles(...INVITE_CAPABLE_ROLES)
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
    @CompanyContext() companyId: string,
    @AuthContext() authContext: AuthContextData,
  ): Promise<InvitationDto> {
    return this.revokeForCompany(id, companyId, currentUser, authContext)
  }

  @Delete('companies/:companyId/invitations/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(LocalRole.SYSTEM_ADMIN, LocalRole.PROJECT_LEAD)
  async revokeForHub(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<InvitationDto> {
    return this.revokeForCompany(id, companyId, currentUser, authContext)
  }

  @Post('invitations/validate-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 10, windowMs: 5 * 60_000, keyPrefix: 'invitations.validate-token' })
  async validateToken(
    @Body() dto: ValidateTokenDto,
  ): Promise<Pick<InvitationDto, 'id' | 'email' | 'role' | 'status' | 'type' | 'expiresAt'>> {
    const invitation = await this.invitationsService.validateToken(dto.token)

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      type: invitation.type,
      expiresAt: invitation.expiresAt.toISOString(),
    }
  }

  private async createForCompany(
    companyId: string,
    currentUser: JwtPayload,
    authContext: AuthContextData,
    dto: CreateInvitationDto,
  ): Promise<CreateInvitationResponseDto> {
    const result = await this.invitationsService.create({
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      companyId,
      email: dto.email,
      role: dto.role as Role,
      withOnboarding: dto.withOnboarding,
    })

    return {
      invitation: this.toDto(result.invitation),
      inviteToken: result.rawToken,
      inviteUrl: result.publicInviteUrl,
      delivery: {
        attempted: result.delivery.attempted,
        sent: result.delivery.sent,
        reason: result.delivery.reason,
        manualShareRequired: result.manualShareRequired,
      },
    }
  }

  private async listForCompany(companyId: string, status?: string): Promise<InvitationDto[]> {
    const invitations = await this.invitationsService.listForCompany(companyId, status)
    return invitations.map((invitation) => this.toDto(invitation))
  }

  private async revokeForCompany(
    id: string,
    companyId: string,
    currentUser: JwtPayload,
    authContext: AuthContextData,
  ): Promise<InvitationDto> {
    const revoked = await this.invitationsService.revoke({
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      companyId,
      invitationId: id,
    })

    return this.toDto(revoked)
  }

  private toDto(invitation: Invitation): InvitationDto {
    return {
      id: invitation.id,
      companyId: invitation.companyId,
      email: invitation.email,
      role: invitation.role as Role,
      status: invitation.status,
      type: invitation.type,
      expiresAt: invitation.expiresAt.toISOString(),
      createdById: invitation.createdById ?? null,
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      revokedAt: invitation.revokedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
    }
  }
}
