import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

// Partial DTO for decision makers — all fields optional for updates
class UpdateDecisionMakerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role?: string

  @IsOptional()
  @IsEmail()
  email?: string
}

// Partial DTO for primary contact — all fields optional for updates
class UpdatePrimaryContactDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string
}

/**
 * UpdateOnboardingSubmissionDto — partial update of form answers.
 * Intentionally EXCLUDES status (client cannot set status to reviewed).
 */
export class UpdateOnboardingSubmissionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  industry?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teamSize?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  yearsOperating?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mainPainPoints?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolsInUse?: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDecisionMakerDto)
  decisionMakers?: UpdateDecisionMakerDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePrimaryContactDto)
  primaryContact?: UpdatePrimaryContactDto

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shortTermGoals?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  midTermGoals?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  successMetrics?: string

  @IsOptional()
  @IsString()
  @IsIn(['no-claro', 'menos-500', '500-2000', 'mas-2000'])
  budgetRange?: string

  @IsOptional()
  @IsString()
  @IsIn(['ya-mismo', '1-2-semanas', 'un-mes', 'evaluando'])
  startTimeframe?: string

  @IsOptional()
  @IsString()
  notes?: string
}
