import { SetMetadata } from '@nestjs/common'

export const OPTIONAL_COMPANY_SCOPE_KEY = 'optionalCompanyScope'

export const OptionalCompanyScope = () => SetMetadata(OPTIONAL_COMPANY_SCOPE_KEY, true)
