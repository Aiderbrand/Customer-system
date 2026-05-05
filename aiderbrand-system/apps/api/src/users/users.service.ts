import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import type { Prisma, User } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException(`User ${id} not found`)
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email)
  }

  async create(data: {
    email: string
    passwordHash: string
    name: string
    avatarUrl?: string
  }): Promise<User> {
    return this.usersRepository.create(data)
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.usersRepository.updatePassword(userId, passwordHash)
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id)
  }

  async upsertByEmailInTx(
    tx: Prisma.TransactionClient,
    data: { email: string; name: string; passwordHash: string },
  ): Promise<{ id: string; email: string; name: string; avatarUrl: string | null }> {
    const existing = await this.usersRepository.findByEmailInTx(tx, data.email)
    if (existing) {
      return this.usersRepository.updateNameInTx(tx, existing.id, data.name)
    }
    return this.usersRepository.createInTx(tx, data)
  }

  async updatePasswordHashInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    return this.usersRepository.updatePasswordHashInTx(tx, userId, passwordHash)
  }
}
