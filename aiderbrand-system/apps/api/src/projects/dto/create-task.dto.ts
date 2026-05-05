import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Priority } from '@prisma/client'

export class CreateTaskDto {
  @IsString()
  @MinLength(1, { message: 'title is required' })
  @MaxLength(200, { message: 'title must be at most 200 characters' })
  title!: string

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @IsOptional()
  @IsUUID()
  phaseId?: string | null

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null

  @IsOptional()
  @IsDateString()
  dueAt?: string | null

  @IsOptional()
  @IsBoolean()
  visibleToClient?: boolean
}
