export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly userName: string,
    public readonly resetUrl: string,
  ) {}
}
