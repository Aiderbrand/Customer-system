import { IsString, IsNotEmpty, Length, MinLength, MaxLength } from 'class-validator'

/**
 * AcceptInvitationDto — payload for POST /auth/accept-invitation
 *
 * The invitee provides:
 * - token: the raw invitation token (96-char hex) from the invite email
 * - name: their display name (required for new users, optional for existing)
 * - password: their chosen password
 *
 * Note: email is derived from the invitation — not provided by the user.
 */
export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  @Length(96, 96, { message: 'token must be a 96-character hex string' })
  token!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(128)
  password!: string
}
