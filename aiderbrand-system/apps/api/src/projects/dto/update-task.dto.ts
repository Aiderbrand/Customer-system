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
import { Priority, TaskStatus } from '@prisma/client'

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus

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
