import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * JwtAuthGuard — validates the Bearer JWT access token.
 * Extends Passport's built-in AuthGuard with 'jwt' strategy.
 *
 * Apply globally or per-controller:
 *   @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
