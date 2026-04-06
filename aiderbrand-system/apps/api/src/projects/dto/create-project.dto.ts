import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateProjectDto {
  @IsString()
  @MinLength(1, { message: 'name is required' })
  @MaxLength(120, { message: 'name must be at most 120 characters' })
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'description must be at most 2000 characters' })
  description?: string
}
