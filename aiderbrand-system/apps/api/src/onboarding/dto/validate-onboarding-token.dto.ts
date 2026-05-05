import { IsNotEmpty, IsString } from 'class-validator'

export class ValidateOnboardingTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string
}
