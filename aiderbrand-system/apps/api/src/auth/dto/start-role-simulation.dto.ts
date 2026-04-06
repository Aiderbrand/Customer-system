import { IsEnum } from 'class-validator'
import { Role } from '../../common/enums/role.enum'

export class StartRoleSimulationDto {
  @IsEnum(Role)
  effectiveRole!: Role
}
