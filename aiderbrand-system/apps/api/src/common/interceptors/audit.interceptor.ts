/**
 * AuditInterceptor — placeholder for cross-cutting audit concerns.
 *
 * Direct audit writing happens in services (not interceptors) to ensure
 * transactional consistency (write audit inside the same transaction).
 *
 * This interceptor can be used for response-time tracking or non-critical
 * metadata enrichment. Keep actual audit writes in AuditService.
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable, tap } from 'rxjs'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const { method, url } = request
    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start
        this.logger.debug(`${method} ${url} — ${elapsed}ms`)
      }),
    )
  }
}
