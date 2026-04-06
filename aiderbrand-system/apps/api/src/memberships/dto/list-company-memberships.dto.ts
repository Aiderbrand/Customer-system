import { IsIn, IsOptional } from 'class-validator'

export class ListCompanyMembershipsDto {
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all'
}
