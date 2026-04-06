import { IsString, MinLength, Length } from 'class-validator'

/**
 * ResetPasswordDto — payload for POST /auth/reset-password.
 *
 * token: the raw opaque token from the reset URL query param.
 * password: the new password (min 8 chars enforced).
 */
export class ResetPasswordDto {
  /** The raw opaque reset token (96 hex chars) */
  @IsString()
  @Length(96, 96, { message: 'token must be exactly 96 characters' })
  token!: string

  /** The new password — minimum 8 characters */
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string
}
