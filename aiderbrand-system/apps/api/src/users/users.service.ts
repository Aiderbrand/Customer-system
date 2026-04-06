import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import type { User } from '@prisma/client'

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
}
