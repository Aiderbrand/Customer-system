import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'name cannot be empty' })
  @MaxLength(120, { message: 'name must be at most 120 characters' })
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'slug cannot be empty' })
  @MaxLength(120, { message: 'slug must be at most 120 characters' })
  slug?: string
}
