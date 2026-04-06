import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, type AuditLog, type Company, type CompanyMembership, type InvitationStatus, type Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface CreateCompanyWithCreatorMembershipResult {
  company: Company
  creatorMembership: CompanyMembership
}

export interface CompanyHubRecord extends Company {
  activeMemberCount: number
  pendingInvitationCount: number
}

export interface CompanyHubSummaryRecord {
  totalCompanies: number
  activeCompanies: number
  inactiveCompanies: number
  companiesWithPendingInvitations: number
}

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: { slug, deletedAt: null },
    })
  }

  async list(params: {
    search?: string
    status?: boolean
    skip: number
    take: number
    orderBy: Prisma.CompanyOrderByWithRelationInput | Prisma.CompanyOrderByWithRelationInput[]
  }): Promise<{ items: CompanyHubRecord[]; totalItems: number; summary: CompanyHubSummaryRecord }> {
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
      ...(typeof params.status === 'boolean' ? { isActive: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, totalItems, totalCompanies, activeCompanies, companiesWithPendingInvitations] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: {
          _count: {
            select: {
              memberships: {
                where: { isActive: true },
              },
              invitations: {
                where: { status: 'PENDING' satisfies InvitationStatus },
              },
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.company.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.company.count({
        where: {
          deletedAt: null,
          invitations: {
            some: {
              status: 'PENDING',
            },
          },
        },
      }),
    ])

    return {
      items: items.map((company) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        deletedAt: company.deletedAt,
        activeMemberCount: company._count.memberships,
        pendingInvitationCount: company._count.invitations,
      })),
      totalItems,
      summary: {
        totalCompanies,
        activeCompanies,
        inactiveCompanies: totalCompanies - activeCompanies,
        companiesWithPendingInvitations,
      },
    }
  }

  async listScoped(params: {
    companyIds: string[]
    search?: string
    status?: boolean
    skip: number
    take: number
    orderBy: Prisma.CompanyOrderByWithRelationInput | Prisma.CompanyOrderByWithRelationInput[]
  }): Promise<{ items: CompanyHubRecord[]; totalItems: number; summary: CompanyHubSummaryRecord }> {
    if (params.companyIds.length === 0) {
      return {
        items: [],
        totalItems: 0,
        summary: {
          totalCompanies: 0,
          activeCompanies: 0,
          inactiveCompanies: 0,
          companiesWithPendingInvitations: 0,
        },
      }
    }

    const where: Prisma.CompanyWhereInput = {
      id: { in: params.companyIds },
      deletedAt: null,
      ...(typeof params.status === 'boolean' ? { isActive: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, totalItems, totalCompanies, activeCompanies, companiesWithPendingInvitations] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: {
          _count: {
            select: {
              memberships: { where: { isActive: true } },
              invitations: { where: { status: 'PENDING' satisfies InvitationStatus } },
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
      this.prisma.company.count({ where: { id: { in: params.companyIds }, deletedAt: null } }),
      this.prisma.company.count({ where: { id: { in: params.companyIds }, deletedAt: null, isActive: true } }),
      this.prisma.company.count({
        where: {
          id: { in: params.companyIds },
          deletedAt: null,
          invitations: { some: { status: 'PENDING' } },
        },
      }),
    ])

    return {
      items: items.map((company) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        deletedAt: company.deletedAt,
        activeMemberCount: company._count.memberships,
        pendingInvitationCount: company._count.invitations,
      })),
      totalItems,
      summary: {
        totalCompanies,
        activeCompanies,
        inactiveCompanies: totalCompanies - activeCompanies,
        companiesWithPendingInvitations,
      },
    }
  }

  async updateCompany(data: {
    companyId: string
    actorId: string
    actorRole: Role
    name: string
    slug: string
  }): Promise<Company> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.update({
          where: { id: data.companyId },
          data: {
            name: data.name,
            slug: data.slug,
          },
        })

        await tx.auditLog.create({
          data: {
            actorId: data.actorId,
            companyId: company.id,
            action: 'company.updated',
            entityType: 'Company',
            entityId: company.id,
            metadata: {
              name: company.name,
              slug: company.slug,
              actorRole: data.actorRole,
            },
          },
        })

        return company
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Company slug "${data.slug}" already exists`)
      }

      throw error
    }
  }

  async updateStatus(data: {
    companyId: string
    actorId: string
    actorRole: Role
    isActive: boolean
  }): Promise<Company> {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id: data.companyId },
        data: {
          isActive: data.isActive,
        },
      })

      await tx.auditLog.create({
        data: {
          actorId: data.actorId,
          companyId: company.id,
          action: data.isActive ? 'company.activated' : 'company.deactivated',
          entityType: 'Company',
          entityId: company.id,
          metadata: {
            isActive: company.isActive,
            actorRole: data.actorRole,
          },
        },
      })

      return company
    })
  }

  async listActivity(companyId: string, take = 20): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
    })
  }

  async createWithCreatorMembership(data: {
    actorId: string
    actorRole: Role
    sourceCompanyId?: string
    name: string
    slug: string
  }): Promise<CreateCompanyWithCreatorMembershipResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: data.name,
            slug: data.slug,
          },
        })

        const creatorMembership = await tx.companyMembership.create({
          data: {
            userId: data.actorId,
            companyId: company.id,
            role: data.actorRole,
          },
        })

        await tx.auditLog.create({
          data: {
            actorId: data.actorId,
            companyId: company.id,
            action: 'company.created',
            entityType: 'Company',
            entityId: company.id,
            metadata: {
              name: company.name,
              slug: company.slug,
              actorRole: data.actorRole,
              sourceCompanyId: data.sourceCompanyId ?? null,
              creatorMembershipGranted: true,
            },
          },
        })

        return { company, creatorMembership }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Company slug "${data.slug}" already exists`)
      }

      throw error
    }
  }
}
