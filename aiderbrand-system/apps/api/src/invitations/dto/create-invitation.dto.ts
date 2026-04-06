import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator'
import { Role } from '../../common/enums/role.enum'

/**
 * CreateInvitationDto — payload for POST /invitations
 *
 * companyId is NOT in the body — it comes from the X-Company-Id header
 * enforced by CompanyMembershipGuard.
 */
export class CreateInvitationDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string

  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  @IsNotEmpty()
  role!: Role
}
