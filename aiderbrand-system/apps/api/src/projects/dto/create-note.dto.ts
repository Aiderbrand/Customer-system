import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class CreateNoteDto {
  @IsString()
  @MinLength(1, { message: 'body is required' })
  @MaxLength(5000, { message: 'body must be at most 5000 characters' })
  body!: string

  @IsOptional()
  @IsUUID('4')
  phaseId?: string

  @IsOptional()
  @IsUUID('4')
  parentId?: string
}
