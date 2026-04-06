import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CompanyMembership, Prisma, Role } from '@prisma/client'

export type MembershipWithCompany = Prisma.CompanyMembershipGetPayload<{ include: { company: true } }>

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndCompany(userId: string, companyId: string): Promise<CompanyMembership | null> {
    return this.prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
    })
  }

  async findDetailedByUserAndCompany(userId: string, companyId: string) {
    return this.prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    })
  }

  async findAllByUser(userId: string): Promise<MembershipWithCompany[]> {
    return this.prisma.companyMembership.findMany({
      where: { userId, isActive: true },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findAllByCompany(companyId: string): Promise<CompanyMembership[]> {
    return this.prisma.companyMembership.findMany({
      where: { companyId, isActive: true },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findAllByCompanyWithStatus(companyId: string, status?: boolean) {
    return this.prisma.companyMembership.findMany({
      where: {
        companyId,
        ...(typeof status === 'boolean' ? { isActive: status } : {}),
      },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async create(data: {
    userId: string
    companyId: string
    role: Role
  }): Promise<CompanyMembership> {
    return this.prisma.companyMembership.create({ data })
  }

  async upsert(data: {
    userId: string
    companyId: string
    role: Role
  }): Promise<CompanyMembership> {
    return this.prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: data.userId, companyId: data.companyId } },
      update: { role: data.role, isActive: true },
      create: data,
    })
  }

  async deactivate(userId: string, companyId: string): Promise<CompanyMembership> {
    return this.prisma.companyMembership.update({
      where: { userId_companyId: { userId, companyId } },
      data: { isActive: false },
    })
  }

  async updateStatus(userId: string, companyId: string, isActive: boolean): Promise<CompanyMembership> {
    return this.prisma.companyMembership.update({
      where: { userId_companyId: { userId, companyId } },
      data: { isActive },
    })
  }

  async updateRole(userId: string, companyId: string, role: Role): Promise<CompanyMembership> {
    return this.prisma.companyMembership.update({
      where: { userId_companyId: { userId, companyId } },
      data: { role },
    })
  }
}
