import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class OnboardingFeatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): boolean {
    const enabled = this.configService.get<boolean>('app.onboarding.enabled')
    if (!enabled) {
      throw new ServiceUnavailableException('Onboarding is currently disabled')
    }
    return true
  }
}
