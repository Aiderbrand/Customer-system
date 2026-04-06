import { SetMetadata } from '@nestjs/common'

export const ALLOW_INTERNAL_CROSS_COMPANY_KEY = 'allowInternalCrossCompany'

export const AllowInternalCrossCompany = () => SetMetadata(ALLOW_INTERNAL_CROSS_COMPANY_KEY, true)
