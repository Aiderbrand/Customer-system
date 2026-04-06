import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import {
  PUBLIC_RATE_LIMIT_METADATA,
  type PublicRateLimitOptions,
} from '../decorators/public-rate-limit.decorator'

interface RateLimitEntry {
  count: number
  resetAt: number
}

@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, RateLimitEntry>()

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<PublicRateLimitOptions>(
      PUBLIC_RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    )

    if (!options) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const now = Date.now()
    const key = this.buildKey(request, options)
    const current = PublicRateLimitGuard.buckets.get(key)

    if (!current || current.resetAt <= now) {
      PublicRateLimitGuard.buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      })
      return true
    }

    if (current.count >= options.limit) {
      throw new HttpException(
        'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    current.count += 1
    PublicRateLimitGuard.buckets.set(key, current)
    return true
  }

  private buildKey(request: Request, options: PublicRateLimitOptions): string {
    const forwardedFor = request.headers['x-forwarded-for']
    const rawIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : request.ip || request.socket.remoteAddress || 'unknown'

    const scopedIdentifier =
      typeof request.body?.email === 'string'
        ? request.body.email.trim().toLowerCase()
        : typeof request.body?.token === 'string'
          ? request.body.token.slice(0, 12)
          : ''

    return `${options.keyPrefix ?? request.route?.path ?? request.url}:${rawIp}:${scopedIdentifier}`
  }
}
