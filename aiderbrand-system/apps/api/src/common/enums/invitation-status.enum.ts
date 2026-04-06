/**
 * InvitationStatus FSM — matches Prisma schema.
 *
 * Valid transitions:
 *   PENDING → ACCEPTED (via accept-invitation endpoint)
 *   PENDING → REVOKED  (via revoke endpoint)
 *   PENDING → EXPIRED  (via scheduled job or on-read check)
 */
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}
