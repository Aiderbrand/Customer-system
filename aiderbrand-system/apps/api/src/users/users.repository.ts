import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { User } from '@prisma/client'

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
}
