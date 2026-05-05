import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma, User } from '@prisma/client'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
  }

  async create(data: {
    email: string
    passwordHash: string
    name: string
    avatarUrl?: string
  }): Promise<User> {
    return this.prisma.user.create({ data })
  }

  async findManyByIds(ids: string[]): Promise<Array<{ id: string; name: string; email: string }>> {
    if (ids.length === 0) return []
    return this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, email: true },
    })
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  /** Update a user's password hash inside an existing transaction */
  async updatePasswordHashInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, updatedAt: new Date() },
    })
  }

  async findByEmailInTx(
    tx: Prisma.TransactionClient,
    email: string,
  ): Promise<User | null> {
    return tx.user.findFirst({ where: { email, deletedAt: null } })
  }

  async updateNameInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    name: string,
  ): Promise<{ id: string; email: string; name: string; avatarUrl: string | null }> {
    return tx.user.update({
      where: { id: userId },
      data: { name, updatedAt: new Date() },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
  }

  async createInTx(
    tx: Prisma.TransactionClient,
    data: { email: string; name: string; passwordHash: string },
  ): Promise<{ id: string; email: string; name: string; avatarUrl: string | null }> {
    return tx.user.create({
      data: { email: data.email, passwordHash: data.passwordHash, name: data.name },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
  }
}
