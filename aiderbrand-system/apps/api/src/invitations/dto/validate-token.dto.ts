import { IsString, IsNotEmpty, Length } from 'class-validator'

/**
 * ValidateTokenDto — payload for POST /invitations/validate-token
 *
 * Used to pre-validate an invitation token before showing the
 * "set your password" form to the user.
 */
export class ValidateTokenDto {
  @IsString()
  @IsNotEmpty()
  @Length(96, 96, { message: 'token must be a 96-character hex string' })
  token!: string
}
