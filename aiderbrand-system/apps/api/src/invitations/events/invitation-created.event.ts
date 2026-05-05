export class InvitationCreatedEvent {
  constructor(
    public readonly invitationType: 'ONBOARDING' | 'MEMBER',
    public readonly email: string,
    public readonly companyName: string,
    public readonly inviteUrl: string,
    public readonly inviterName: string | null,
    public readonly roleLabel: string,
    public readonly actorId: string,
    public readonly companyId: string,
    public readonly invitationId: string,
    public readonly role: string,
  ) {}
}
