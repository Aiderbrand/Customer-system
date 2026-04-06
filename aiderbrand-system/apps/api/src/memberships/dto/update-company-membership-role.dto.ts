import { IsEnum } from 'class-validator'
import { Role } from '../../common/enums/role.enum'

export class UpdateCompanyMembershipRoleDto {
  @IsEnum(Role)
  role!: Role
}
