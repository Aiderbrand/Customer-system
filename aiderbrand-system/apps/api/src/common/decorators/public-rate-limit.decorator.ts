import { SetMetadata } from '@nestjs/common'

export interface PublicRateLimitOptions {
  limit: number
  windowMs: number
  keyPrefix?: string
}

export const PUBLIC_RATE_LIMIT_METADATA = 'public-rate-limit'

export const PublicRateLimit = (options: PublicRateLimitOptions) =>
  SetMetadata(PUBLIC_RATE_LIMIT_METADATA, options)
