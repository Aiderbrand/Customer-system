import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../../users/users.service'
import type { JwtPayload } from '../../common/types/jwt-payload.type'

/**
 * JwtStrategy — validates the Bearer JWT access token.
 *
 * Attaches the decoded JwtPayload to request.user on success.
 * Used by JwtAuthGuard (extends AuthGuard('jwt')).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.accessSecret') ?? 'CHANGE_ME_ACCESS',
    })
  }

  /**
   * Called by passport-jwt after token signature is verified.
   * Validates that the user still exists and is active.
   * Returns the payload which becomes request.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type')
    }

    const user = await this.usersService.findByIdOrThrow(payload.sub).catch(() => {
      throw new UnauthorizedException('User not found or inactive')
    })

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive')
    }

    // Return the payload — this becomes request.user
    return payload
  }
}
