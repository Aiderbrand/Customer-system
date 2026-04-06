import { IsIn } from 'class-validator'

export const COMPANY_STATUS_VALUES = ['active', 'inactive'] as const

export class UpdateCompanyStatusDto {
  @IsIn(COMPANY_STATUS_VALUES)
  status!: (typeof COMPANY_STATUS_VALUES)[number]
}
