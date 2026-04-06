import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@prisma/client'
import type { AuthContextData, JwtPayload, RequestWithAuthContext } from '../types'
import { Role as LocalRole } from '../enums/role.enum'
import { PrismaService } from '../../prisma/prisma.service'
import { RoleSimulationRepository } from '../../auth/role-simulation.repository'
import { AuditService, type AuditAuthContextMetadata } from '../../audit/audit.service'
import { ALLOW_INTERNAL_CROSS_COMPANY_KEY } from '../decorators/allow-internal-cross-company.decorator'
import { OPTIONAL_COMPANY_SCOPE_KEY } from '../decorators/optional-company-scope.decorator'

const CROSS_COMPANY_ROLES = new Set<Role>([
  LocalRole.SYSTEM_ADMIN,
  LocalRole.PROJECT_LEAD,
  LocalRole.DELIVERY_SPECIALIST,
])

@Injectable()
export class AuthContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly roleSimulationRepository: RoleSimulationRepository,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>()
    const user = request.user as JwtPayload | undefined

    if (!user?.sub) {
      throw new UnauthorizedException('Authentication required')
    }

    const optionalCompanyScope = this.reflector.getAllAndOverride<boolean>(OPTIONAL_COMPANY_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const allowInternalCrossCompany = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INTERNAL_CROSS_COMPANY_KEY,
      [context.getHandler(), context.getClass()],
    )

    const scopedCompanyId = this.resolveExplicitCompanyScope(request, optionalCompanyScope ?? false)

    let simulation: Awaited<ReturnType<RoleSimulationRepository['findActiveByActorOrFailClosed']>>

    try {
      simulation = await this.roleSimulationRepository.findActiveByActorOrFailClosed(user.sub)
    } catch (error) {
          if (error instanceof ServiceUnavailableException) {
        await this.auditService.logSafe({
          actorId: user.sub,
          companyId: scopedCompanyId ?? undefined,
          action: 'auth.simulation.denied',
          entityType: 'RoleSimulationSession',
          metadata: this.auditService.withAuditAuthContext(
            { reason: 'invalid_state', requestedCompanyId: scopedCompanyId },
            await this.buildAuditAuthContext(user.sub, user.email, scopedCompanyId, null, null, null),
          ),
        })
      }

      throw error
    }

    const actorHasSystemAdminCapability = await this.hasSystemAdminCapability(user.sub)
    const actorScope = await this.resolveActorScope(user.sub)
    const realMembership = scopedCompanyId
      ? await this.findActiveMembership(user.sub, scopedCompanyId)
      : null
    const fallbackCrossCompanyRole = allowInternalCrossCompany
      ? await this.findHighestActiveRole(user.sub)
      : null
    const effectiveRole = simulation?.effectiveRole ?? realMembership?.role ?? fallbackCrossCompanyRole

    if (!effectiveRole) {
      throw new ForbiddenException('You are not allowed to access this company scope')
    }

    if (scopedCompanyId) {
      const scopedCompany = await this.prisma.company.findFirst({
        where: {
          id: scopedCompanyId,
          isActive: true,
          deletedAt: null,
        },
      })

      if (!scopedCompany) {
        throw new ForbiddenException('Invalid company scope')
      }
    }

    const canAccessScope = scopedCompanyId
      ? (allowInternalCrossCompany && CROSS_COMPANY_ROLES.has(effectiveRole))
        || this.canUseCrossCompanyScope(effectiveRole, actorHasSystemAdminCapability)
        || !!realMembership
      : (optionalCompanyScope ?? false) && (
        (allowInternalCrossCompany && CROSS_COMPANY_ROLES.has(effectiveRole))
        || this.canUseCrossCompanyScope(effectiveRole, actorHasSystemAdminCapability)
        || actorScope.membershipCompanyIds.length > 0
      )

    if (!canAccessScope) {
      if (simulation) {
        await this.logDeniedSimulation(user, simulation, 'company_scope_forbidden', { requestedCompanyId: scopedCompanyId })
      }

      throw new ForbiddenException('You are not allowed to access this company scope')
    }

    const authContext: AuthContextData = {
      actorUserId: user.sub,
      actorEmail: user.email,
      actorHasSystemAdminCapability,
      actorScope,
      scopedCompanyId,
      effectiveRole,
      realMembershipRole: realMembership?.role ?? null,
      simulation: simulation
        ? {
            sessionId: simulation.id,
            effectiveRole: simulation.effectiveRole,
            startedAt: simulation.startedAt,
          }
        : null,
    }

    request.authContext = authContext

    if (simulation) {
        await this.auditService.logSafe({
          actorId: user.sub,
          companyId: authContext.scopedCompanyId ?? undefined,
          action: 'auth.simulation.protected_action',
          metadata: this.auditService.withAuthContext(
          {
            method: request.method,
            path: request.route?.path ?? request.path,
            originalUrl: request.originalUrl,
          },
          authContext,
        ),
      })
    }

    return true
  }

  private resolveExplicitCompanyScope(
    request: RequestWithAuthContext,
    optionalCompanyScope: boolean,
  ): string | null {
    const headerValue = request.headers['x-company-id']
    const queryValue = request.query?.companyId
    const bodyValue = typeof request.body === 'object' && request.body !== null && 'companyId' in request.body
      ? (request.body as { companyId?: unknown }).companyId
      : undefined
    const paramValue = request.params?.companyId
    const candidates = [headerValue, queryValue, bodyValue, paramValue].filter((value) => value !== undefined)

    const normalizedValues = candidates.flatMap((value) => Array.isArray(value) ? value : [value])

    if (normalizedValues.length === 0) {
      if (optionalCompanyScope) {
        return null
      }

      throw new BadRequestException('Explicit company scope is required')
    }

    const first = normalizedValues[0]

    if (typeof first !== 'string' || !first.trim()) {
      throw new BadRequestException('Explicit company scope is required')
    }

    return first
  }

  private async findHighestActiveRole(actorUserId: string): Promise<Role | null> {
    const memberships = await this.prisma.companyMembership.findMany({
      where: {
        userId: actorUserId,
        isActive: true,
        company: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        role: true,
      },
    })

    const orderedRoles = memberships
      .map((membership) => membership.role)
      .sort((left, right) => {
        const scores: Record<Role, number> = {
          [LocalRole.SYSTEM_ADMIN]: 100,
          [LocalRole.PROJECT_LEAD]: 80,
          [LocalRole.DELIVERY_SPECIALIST]: 60,
          [LocalRole.ACCOUNT_OWNER]: 40,
          [LocalRole.COLLABORATOR]: 20,
        }

        return scores[right] - scores[left]
      })

    return orderedRoles[0] ?? null
  }

  private canUseCrossCompanyScope(effectiveRole: Role, actorHasSystemAdminCapability: boolean): boolean {
    return actorHasSystemAdminCapability && CROSS_COMPANY_ROLES.has(effectiveRole)
  }

  private async hasSystemAdminCapability(actorUserId: string): Promise<boolean> {
    const actorAdminMembership = await this.prisma.companyMembership.findFirst({
      where: {
        userId: actorUserId,
        role: LocalRole.SYSTEM_ADMIN,
        isActive: true,
        company: {
          isActive: true,
          deletedAt: null,
        },
      },
    })

    return !!actorAdminMembership
  }

  private async resolveActorScope(actorUserId: string): Promise<AuthContextData['actorScope']> {
    const memberships = await this.prisma.companyMembership.findMany({
      where: {
        userId: actorUserId,
        isActive: true,
        company: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        companyId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const membershipCompanyIds = memberships.map((membership) => membership.companyId)
    const actorHasSystemAdminCapability = await this.hasSystemAdminCapability(actorUserId)

    const realDataCompanyIds = actorHasSystemAdminCapability
      ? (await this.prisma.company.findMany({
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })).map((company) => company.id)
      : membershipCompanyIds

    return {
      membershipCompanyIds,
      realDataCompanyIds,
    }
  }

  private async findActiveMembership(actorUserId: string, companyId: string) {
    return this.prisma.companyMembership.findFirst({
      where: {
        userId: actorUserId,
        companyId,
        isActive: true,
        company: {
          isActive: true,
          deletedAt: null,
        },
      },
    })
  }

  private async logDeniedSimulation(
    actor: JwtPayload,
    simulation: Awaited<ReturnType<RoleSimulationRepository['requireActiveByActor']>>,
    reason: string,
    extraMetadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.logSafe({
      actorId: actor.sub,
      action: 'auth.simulation.denied',
      metadata: this.auditService.withAuditAuthContext(
        {
          reason,
          simulationSessionId: simulation.id,
          effectiveRole: simulation.effectiveRole,
          ...(extraMetadata ?? {}),
        },
        await this.buildAuditAuthContext(
          actor.sub,
          actor.email,
          (extraMetadata?.requestedCompanyId as string | null | undefined) ?? null,
          simulation.effectiveRole,
          null,
          {
            sessionId: simulation.id,
            effectiveRole: simulation.effectiveRole,
            startedAt: simulation.startedAt.toISOString(),
          },
        ),
      ),
    })
  }

  private async buildAuditAuthContext(
    actorUserId: string,
    actorEmail: string,
    scopedCompanyId: string | null,
    effectiveRole: Role | null,
    realMembershipRole: Role | null,
    simulation: AuditAuthContextMetadata['simulation'],
  ): Promise<AuditAuthContextMetadata> {
    return {
      actorUserId,
      actorEmail,
      actorHasSystemAdminCapability: await this.hasSystemAdminCapability(actorUserId),
      actorScope: await this.resolveActorScope(actorUserId),
      scopedCompanyId,
      effectiveRole,
      realMembershipRole,
      simulation,
    }
  }
}

export { AuthContextGuard as CompanyMembershipGuard }
