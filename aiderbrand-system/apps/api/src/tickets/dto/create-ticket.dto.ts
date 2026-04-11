import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { Priority } from '@prisma/client'

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(Priority)
  priority!: Priority

  @IsUUID()
  @IsOptional()
  projectId?: string
}

export class UpdateTicketDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority

  @IsUUID()
  @IsOptional()
  projectId?: string | null
}

export class ChangeStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string
}

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string

  @IsOptional()
  @IsEnum(['public', 'internal'])
  type?: 'public' | 'internal'
}

export class AssignTicketDto {
  @IsUUID()
  assigneeId!: string
}
