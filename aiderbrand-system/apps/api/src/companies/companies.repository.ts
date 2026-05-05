import { Injectable } from '@nestjs/common'
import { OnboardingStatus, Prisma, type Company, type InvitationStatus, type Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

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
        onboardingStatus: company.onboardingStatus,
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
        onboardingStatus: company.onboardingStatus,
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
    name: string
    slug: string
  }): Promise<Company> {
    return this.prisma.company.update({
      where: { id: data.companyId, deletedAt: null },
      data: { name: data.name, slug: data.slug },
    })
  }

  async updateStatus(data: {
    companyId: string
    isActive: boolean
  }): Promise<Company> {
    return this.prisma.company.update({
      where: { id: data.companyId, deletedAt: null },
      data: { isActive: data.isActive },
    })
  }

  async createInTx(
    tx: Prisma.TransactionClient,
    data: { name: string; slug: string },
  ): Promise<Company> {
    return tx.company.create({ data: { name: data.name, slug: data.slug } })
  }

  async updateOnboardingStatus(companyId: string, status: OnboardingStatus): Promise<void> {
    await this.prisma.company.update({
      where: { id: companyId, deletedAt: null },
      data: { onboardingStatus: status },
    })
  }

  async updateOnboardingStatusInTx(tx: Prisma.TransactionClient, companyId: string, status: OnboardingStatus): Promise<void> {
    await tx.company.update({
      where: { id: companyId, deletedAt: null },
      data: { onboardingStatus: status },
    })
  }

  async findAllActiveIds(): Promise<string[]> {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    return companies.map((c) => c.id)
  }
}
