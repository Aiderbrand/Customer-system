import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export const COMPANY_STATUS_FILTERS = ['active', 'inactive'] as const
export const COMPANY_SORT_OPTIONS = [
  'name.asc',
  'name.desc',
  'updatedAt.asc',
  'updatedAt.desc',
  'status.asc',
  'status.desc',
] as const

export class ListCompaniesDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsIn(COMPANY_STATUS_FILTERS)
  status?: (typeof COMPANY_STATUS_FILTERS)[number]

  @IsOptional()
  @IsIn(COMPANY_SORT_OPTIONS)
  sort?: (typeof COMPANY_SORT_OPTIONS)[number]

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}
