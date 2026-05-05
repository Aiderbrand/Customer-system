import type { InvitationStatus, InvitationType, Role } from '@prisma/client'

/**
 * InvitationDto — public representation of an invitation.
 *
 * NEVER includes the raw token or tokenHash in responses.
 * The raw token is only returned at creation time via CreateInvitationResponseDto.
 */
export interface InvitationDto {
  id: string
  companyId: string
  email: string
  role: Role
  status: InvitationStatus
  type: InvitationType
  expiresAt: string // ISO8601
  createdById: string | null
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

/**
 * CreateInvitationResponseDto — returned from POST /invitations.
 *
 * Includes the raw invitation token ONCE (caller sends via email).
 * The token is never stored raw and never returned again.
 */
export interface CreateInvitationResponseDto {
  invitation: InvitationDto
  inviteToken: string
  inviteUrl: string | null
  delivery: {
    attempted: boolean
    sent: boolean
    reason: 'sent' | 'disabled' | 'failed' | 'email_queued'
    manualShareRequired: boolean
  }
}
