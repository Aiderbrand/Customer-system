import { Injectable } from '@nestjs/common'
import type { AuditLog } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateAuditLogDto } from './audit.dto'

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuditLogDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: dto.actorId ?? null,
        companyId: dto.companyId ?? null,
        action: dto.action,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        metadata: dto.metadata ? (dto.metadata as object) : undefined,
      },
    })
  }

  async findByCompanyId(companyId: string, take = 20): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take,
    })
  }
}
