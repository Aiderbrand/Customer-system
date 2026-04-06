import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CreatePhaseDto {
  @IsString()
  @MinLength(1, { message: 'name is required' })
  @MaxLength(120, { message: 'name must be at most 120 characters' })
  name!: string

  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsDateString()
  dueAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'milestone must be at most 200 characters' })
  milestone?: string

  @IsOptional()
  @IsBoolean()
  isClientVisible?: boolean
}
