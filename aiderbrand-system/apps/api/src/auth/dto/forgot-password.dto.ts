import { IsEmail } from 'class-validator'

/**
 * ForgotPasswordDto — payload for POST /auth/forgot-password.
 *
 * Only email is required. The response is always generic (200)
 * regardless of whether the email exists — oracle prevention.
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string
}
