import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { Role } from '../../common/enums/role.enum'

export class DecisionMakerDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  role!: string

  @IsEmail()
  email!: string
}

export class PrimaryContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  role!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  phone?: string
}

export class FormAnswersDto {
  @IsString()
  @IsNotEmpty()
  industry!: string

  @IsString()
  @IsNotEmpty()
  teamSize!: string

  @IsString()
  @IsNotEmpty()
  yearsOperating!: string

  @IsString()
  @IsNotEmpty()
  mainPainPoints!: string

  @IsArray()
  @IsString({ each: true })
  toolsInUse!: string[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecisionMakerDto)
  decisionMakers!: DecisionMakerDto[]

  @ValidateNested()
  @Type(() => PrimaryContactDto)
  primaryContact!: PrimaryContactDto

  @IsString()
  @IsNotEmpty()
  shortTermGoals!: string

  @IsString()
  @IsNotEmpty()
  midTermGoals!: string

  @IsString()
  @IsNotEmpty()
  successMetrics!: string

  @IsOptional()
  @IsString()
  budgetRange?: string

  @IsOptional()
  @IsString()
  startTimeframe?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class TeamInviteDto {
  @IsEmail()
  email!: string

  @IsIn([Role.COLLABORATOR, Role.ACCOUNT_OWNER])
  role!: Role
}

export class CompleteOnboardingDto {
  @IsString()
  @IsNotEmpty()
  token!: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(8)
  password!: string

  @ValidateNested()
  @Type(() => FormAnswersDto)
  formAnswers!: FormAnswersDto

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamInviteDto)
  teamInvites?: TeamInviteDto[]
}
