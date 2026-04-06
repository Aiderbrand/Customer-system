import { IsBoolean } from 'class-validator'

export class UpdateCompanyMembershipStatusDto {
  @IsBoolean()
  isActive!: boolean
}
