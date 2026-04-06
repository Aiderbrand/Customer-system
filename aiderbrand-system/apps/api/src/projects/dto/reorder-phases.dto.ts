import { IsArray, IsUUID } from 'class-validator'

export class ReorderPhasesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds!: string[]
}
