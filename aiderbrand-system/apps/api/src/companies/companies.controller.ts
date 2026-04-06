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
import { CompaniesService } from './companies.service'
import { CreateCompanyDto } from './dto/create-company.dto'
import {
  type CompaniesListResponseDto,
  type CompanyActivityItemDto,
  type CompanyDetailResponseDto,
  type CompanyDto,
  type CompanyHubItemDto,
  type CompanyScopeOptionDto,
  type CreateCompanyResponseDto,
} from './dto/company-response.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import {
  AllowInternalCrossCompany,
  AuthContext,
  CompanyContext,
  CurrentUser,
  OptionalCompanyScope,
  RequireRoles,
} from '../common/decorators'
import { Role } from '../common/enums/role.enum'
import type { JwtPayload } from '../common/types/jwt-payload.type'
import type { AuthContextData } from '../common/types'
import { ListCompaniesDto } from './dto/list-companies.dto'
import { UpdateCompanyDto } from './dto/update-company.dto'
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto'

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('options')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async listScopedOptions(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CompanyScopeOptionDto[]> {
    const companies = await this.companiesService.listScopedOptionsForActor(currentUser.sub)

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      createdAt: company.createdAt.toISOString(),
    }))
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.ACCOUNT_OWNER)
  async list(
    @Query() query: ListCompaniesDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CompaniesListResponseDto> {
    const result = await this.companiesService.list({
      ...query,
      actorUserId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
    })

    return {
      items: result.items.map((company) => this.toCompanyHubItemDto(company)),
      summary: result.summary,
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @OptionalCompanyScope()
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN)
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() currentUser: JwtPayload,
    @CompanyContext() sourceCompanyId: string | null,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CreateCompanyResponseDto> {
    const result = await this.companiesService.create({
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      sourceCompanyId: sourceCompanyId ?? undefined,
      name: dto.name,
      slug: dto.slug,
    })

    return {
      company: this.toCompanyDto(result.company),
      creatorMembership: {
        companyId: result.creatorMembership.companyId,
        role: result.creatorMembership.role,
        isActive: result.creatorMembership.isActive,
      },
    }
  }

  @Get(':companyId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.ACCOUNT_OWNER)
  async getDetail(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CompanyDetailResponseDto> {
    const result = await this.companiesService.getDetail({
      companyId,
      actorRole: authContext.effectiveRole as Role,
    })

    return {
      company: {
        ...this.toCompanyDto(result.company),
        activeMemberCount: result.company.activeMemberCount,
        pendingInvitationCount: result.company.pendingInvitationCount,
      },
      members: result.members.map((membership) => ({
        userId: membership.userId,
        companyId: membership.companyId,
        role: membership.role,
        isActive: membership.isActive,
        createdAt: membership.createdAt.toISOString(),
        updatedAt: membership.updatedAt.toISOString(),
        user: {
          id: membership.user.id,
          email: membership.user.email,
          name: membership.user.name,
          avatarUrl: membership.user.avatarUrl,
        },
      })),
      invitations: result.invitations.map((invitation) => ({
        id: invitation.id,
        companyId: invitation.companyId,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdById: invitation.createdById,
        acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
        revokedAt: invitation.revokedAt?.toISOString() ?? null,
        createdAt: invitation.createdAt.toISOString(),
      })),
      projects: [],
      activity: result.activity?.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        actorId: item.actorId,
        createdAt: item.createdAt.toISOString(),
        metadata: item.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : null,
      })),
    }
  }

  @Patch(':companyId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CompanyDto> {
    const company = await this.companiesService.update({
      companyId,
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      name: dto.name,
      slug: dto.slug,
    })

    return this.toCompanyDto(company)
  }

  @Patch(':companyId/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN)
  async updateStatus(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateCompanyStatusDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CompanyDto> {
    const company = await this.companiesService.updateStatus({
      companyId,
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      status: dto.status,
    })

    return this.toCompanyDto(company)
  }

  @Get(':companyId/activity')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN)
  async listActivity(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<CompanyActivityItemDto[]> {
    const items = await this.companiesService.listActivity(companyId)

    return items.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      actorId: item.actorId,
      createdAt: item.createdAt.toISOString(),
      metadata: item.metadata && typeof item.metadata === 'object'
        ? (item.metadata as Record<string, unknown>)
        : null,
    }))
  }

  private toCompanyDto(company: {
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }): CompanyDto {
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      isActive: company.isActive,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    }
  }

  private toCompanyHubItemDto(company: {
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    activeMemberCount: number
    pendingInvitationCount: number
  }): CompanyHubItemDto {
    return {
      ...this.toCompanyDto(company),
      activeMemberCount: company.activeMemberCount,
      pendingInvitationCount: company.pendingInvitationCount,
    }
  }
}
