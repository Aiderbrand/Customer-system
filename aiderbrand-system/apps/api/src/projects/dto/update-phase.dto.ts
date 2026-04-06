import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { PhaseStatus } from '@prisma/client'

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsEnum(PhaseStatus)
  status?: PhaseStatus

  @IsOptional()
  @IsDateString()
  startsAt?: string | null

  @IsOptional()
  @IsDateString()
  dueAt?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  milestone?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  blocker?: string | null

  @IsOptional()
  @IsBoolean()
  isClientVisible?: boolean
}
