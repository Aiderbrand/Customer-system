import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common'
import { MembershipsService } from './memberships.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import {
  AllowInternalCrossCompany,
  AuthContext,
  CurrentUser,
  RequireRoles,
} from '../common/decorators'
import { Role } from '../common/enums/role.enum'
import { ListCompanyMembershipsDto } from './dto/list-company-memberships.dto'
import { UpdateCompanyMembershipRoleDto } from './dto/update-company-membership-role.dto'
import { UpdateCompanyMembershipStatusDto } from './dto/update-company-membership-status.dto'
import type { CompanyMembershipItemDto } from './dto/company-membership-response.dto'
import type { AuthContextData, JwtPayload } from '../common/types'

@Controller('companies/:companyId/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.ACCOUNT_OWNER)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: ListCompanyMembershipsDto,
  ): Promise<CompanyMembershipItemDto[]> {
    const memberships = await this.membershipsService.listMembershipsForCompany(companyId, query.status)
    return memberships.map((membership) => ({
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
    }))
  }

  @Patch(':userId/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD)
  async updateStatus(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateCompanyMembershipStatusDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CompanyMembershipItemDto> {
    await this.membershipsService.updateMembershipStatus({
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      companyId,
      userId,
      isActive: dto.isActive,
    })

    const responseTarget = await this.membershipsService.getDetailedMembership(companyId, userId)

    if (!responseTarget) {
      throw new InternalServerErrorException('Updated membership disappeared unexpectedly')
    }

    return {
      userId: responseTarget.userId,
      companyId: responseTarget.companyId,
      role: responseTarget.role,
      isActive: responseTarget.isActive,
      createdAt: responseTarget.createdAt.toISOString(),
      updatedAt: responseTarget.updatedAt.toISOString(),
      user: {
        id: responseTarget.user.id,
        email: responseTarget.user.email,
        name: responseTarget.user.name,
        avatarUrl: responseTarget.user.avatarUrl,
      },
    }
  }

  @Patch(':userId/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @AllowInternalCrossCompany()
  @RequireRoles(Role.SYSTEM_ADMIN, Role.PROJECT_LEAD, Role.ACCOUNT_OWNER)
  async updateRole(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateCompanyMembershipRoleDto,
    @CurrentUser() currentUser: JwtPayload,
    @AuthContext() authContext: AuthContextData,
  ): Promise<CompanyMembershipItemDto> {
    await this.membershipsService.updateMembershipRole({
      actorId: currentUser.sub,
      actorRole: authContext.effectiveRole as Role,
      companyId,
      userId,
      role: dto.role as Role,
    })

    const responseTarget = await this.membershipsService.getDetailedMembership(companyId, userId)

    if (!responseTarget) {
      throw new InternalServerErrorException('Updated membership disappeared unexpectedly')
    }

    return {
      userId: responseTarget.userId,
      companyId: responseTarget.companyId,
      role: responseTarget.role,
      isActive: responseTarget.isActive,
      createdAt: responseTarget.createdAt.toISOString(),
      updatedAt: responseTarget.updatedAt.toISOString(),
      user: {
        id: responseTarget.user.id,
        email: responseTarget.user.email,
        name: responseTarget.user.name,
        avatarUrl: responseTarget.user.avatarUrl,
      },
    }
  }
}
