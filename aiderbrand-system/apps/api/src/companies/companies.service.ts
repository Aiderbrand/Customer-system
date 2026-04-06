import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { AuditLog, Company, Role } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { CompaniesRepository } from './companies.repository'
import { Role as LocalRole } from '../common/enums/role.enum'
import { MembershipsService } from '../memberships/memberships.service'
import { InvitationsService } from '../invitations/invitations.service'

const COMPANY_CREATOR_ROLES = new Set<Role>([LocalRole.SYSTEM_ADMIN])
const COMPANY_EDITOR_ROLES = new Set<Role>([LocalRole.SYSTEM_ADMIN, LocalRole.PROJECT_LEAD])

type CompanySort = 'name.asc' | 'name.desc' | 'updatedAt.asc' | 'updatedAt.desc' | 'status.asc' | 'status.desc'

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly membershipsService: MembershipsService,
    private readonly invitationsService: InvitationsService,
  ) {}

  async create(params: {
    actorId: string
    actorRole: Role
    sourceCompanyId?: string
    name: string
    slug?: string
  }) {
    const normalizedName = this.normalizeName(params.name)
    const normalizedSlug = this.normalizeSlug(params.slug ?? normalizedName)

    if (!COMPANY_CREATOR_ROLES.has(params.actorRole)) {
      throw new ForbiddenException(
        `Your role (${params.actorRole}) is not allowed to create companies`,
      )
    }

    const existing = await this.companiesRepository.findBySlug(normalizedSlug)
    if (existing) {
      throw new ConflictException(`Company slug "${normalizedSlug}" already exists`)
    }

    return this.companiesRepository.createWithCreatorMembership({
      actorId: params.actorId,
      actorRole: params.actorRole,
      sourceCompanyId: params.sourceCompanyId,
      name: normalizedName,
      slug: normalizedSlug,
    })
  }

  async list(params: {
    actorUserId?: string
    actorRole?: Role
    q?: string
    status?: 'active' | 'inactive'
    sort?: CompanySort
    page?: number
    pageSize?: number
  }) {
    const page = params.page && params.page > 0 ? params.page : 1
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10
    const search = params.q?.trim() || undefined
    const query = {
      search,
      status: params.status ? params.status === 'active' : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: this.resolveSort(params.sort),
    }

    const result = params.actorRole === LocalRole.ACCOUNT_OWNER && params.actorUserId
      ? await this.companiesRepository.listScoped({
          ...query,
          companyIds: (await this.membershipsService.getMembershipsForUser(params.actorUserId))
            .filter((membership) => membership.isActive && membership.role === LocalRole.ACCOUNT_OWNER)
            .map((membership) => membership.companyId),
        })
      : await this.companiesRepository.list(query)

    return {
      ...result,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(result.totalItems / pageSize)),
    }
  }

  async listScopedOptionsForActor(actorUserId: string) {
    const memberships = await this.membershipsService.getMembershipsForUser(actorUserId)
    const actorHasSystemAdminCapability = memberships.some(
      (membership) => membership.isActive && membership.role === LocalRole.SYSTEM_ADMIN,
    )

    if (actorHasSystemAdminCapability) {
      return this.companiesRepository.list({
        status: true,
        skip: 0,
        take: 10_000,
        orderBy: { createdAt: 'asc' },
      }).then((result) => result.items.map((company) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        createdAt: company.createdAt,
      })))
    }

    const companies = memberships
      .filter((membership) => {
        const company = (membership as typeof membership & {
          company?: {
            isActive: boolean
            deletedAt: Date | null
          } | null
        }).company

        return membership.isActive && !!company && company.isActive && company.deletedAt === null
      })
      .map((membership) => ({
        id: membership.companyId,
        name: (membership as typeof membership & { company: { name: string } }).company.name,
        slug: (membership as typeof membership & { company: { slug: string } }).company.slug,
        createdAt: (membership as typeof membership & { company: { createdAt: Date } }).company.createdAt,
      }))

    const seen = new Set<string>()

    return companies.filter((company) => {
      if (seen.has(company.id)) {
        return false
      }

      seen.add(company.id)
      return true
    })
  }

  async getDetail(params: {
    companyId: string
    actorRole: Role
  }) {
    const company = await this.findByIdOrThrow(params.companyId)
    const [members, invitations, activity] = await Promise.all([
      this.membershipsService.listMembershipsForCompany(company.id, 'all'),
      this.invitationsService.listForCompany(company.id),
      params.actorRole === LocalRole.SYSTEM_ADMIN ? this.listActivity(company.id) : Promise.resolve(undefined),
    ])

    return {
      company: {
        ...company,
        activeMemberCount: members.filter((membership) => membership.isActive).length,
        pendingInvitationCount: invitations.filter((invitation) => invitation.status === 'PENDING').length,
      },
      members,
      invitations,
      projects: [] as Array<never>,
      activity,
    }
  }

  async update(params: {
    companyId: string
    actorId: string
    actorRole: Role
    name?: string
    slug?: string
  }): Promise<Company> {
    if (!COMPANY_EDITOR_ROLES.has(params.actorRole)) {
      throw new ForbiddenException(`Your role (${params.actorRole}) is not allowed to update companies`)
    }

    const company = await this.findByIdOrThrow(params.companyId)
    const nextName = params.name ? this.normalizeName(params.name) : company.name
    const nextSlug = params.slug ? this.normalizeSlug(params.slug) : company.slug

    return this.companiesRepository.updateCompany({
      companyId: company.id,
      actorId: params.actorId,
      actorRole: params.actorRole,
      name: nextName,
      slug: nextSlug,
    })
  }

  async updateStatus(params: {
    companyId: string
    actorId: string
    actorRole: Role
    status: 'active' | 'inactive'
  }): Promise<Company> {
    if (params.actorRole !== LocalRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only SYSTEM_ADMIN can change company status')
    }

    const company = await this.findByIdOrThrow(params.companyId)
    const nextIsActive = params.status === 'active'

    if (company.isActive === nextIsActive) {
      return company
    }

    return this.companiesRepository.updateStatus({
      companyId: company.id,
      actorId: params.actorId,
      actorRole: params.actorRole,
      isActive: nextIsActive,
    })
  }

  async findByIdOrThrow(id: string): Promise<Company> {
    const company = await this.companiesRepository.findById(id)
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`)
    }
    return company
  }

  async listActivity(companyId: string): Promise<AuditLog[]> {
    await this.findByIdOrThrow(companyId)
    return this.companiesRepository.listActivity(companyId)
  }

  private resolveSort(sort?: CompanySort) {
    switch (sort) {
      case 'name.asc':
        return { name: 'asc' } satisfies Prisma.CompanyOrderByWithRelationInput
      case 'name.desc':
        return { name: 'desc' } satisfies Prisma.CompanyOrderByWithRelationInput
      case 'updatedAt.asc':
        return { updatedAt: 'asc' } satisfies Prisma.CompanyOrderByWithRelationInput
      case 'status.asc':
        return [
          { isActive: 'asc' },
          { name: 'asc' },
        ] satisfies Prisma.CompanyOrderByWithRelationInput[]
      case 'status.desc':
        return [
          { isActive: 'desc' },
          { name: 'asc' },
        ] satisfies Prisma.CompanyOrderByWithRelationInput[]
      case 'updatedAt.desc':
      default:
        return { updatedAt: 'desc' } satisfies Prisma.CompanyOrderByWithRelationInput
    }
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim()

    if (!normalizedName) {
      throw new BadRequestException('Company name is required')
    }

    return normalizedName
  }

  private normalizeSlug(rawSlug: string): string {
    const normalizedSlug = rawSlug
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!normalizedSlug) {
      throw new BadRequestException(
        'Company slug is invalid — use letters, numbers, or separators that normalize to them',
      )
    }

    if (normalizedSlug.length > 80) {
      throw new BadRequestException('Company slug must be at most 80 characters long')
    }

    return normalizedSlug
  }
}
