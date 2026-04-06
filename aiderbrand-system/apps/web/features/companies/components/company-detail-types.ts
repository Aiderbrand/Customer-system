import type {
  CompanyActivityItem,
  CompanyDetailMembershipItem,
  CompanyDetailPayload,
  Invitation,
} from '@/lib/types'

export interface CompanyDetailPermissions {
  canInvite: boolean
  canUpdate: boolean
  canUpdateMemberships: boolean
  canUpdateStatus: boolean
  canViewActivity: boolean
}

export interface CompanyDetailMetric {
  label: string
  value: string
  hint: string
}

export interface CompanyDetailFact {
  label: string
  value: string
}

export interface CompanyDetailSectionFlags {
  showActivitySection: boolean
  showPrimaryInvite: boolean
  showSecondaryEdit: boolean
  showSecondaryStatus: boolean
  canManageInvitations: boolean
  canManageMemberships: boolean
}

export interface CompanyDetailViewModel {
  activeMembers: CompanyDetailMembershipItem[]
  inactiveMembers: CompanyDetailMembershipItem[]
  pendingInvitations: Invitation[]
  recentActivity: CompanyActivityItem[]
  overviewMetrics: CompanyDetailMetric[]
  overviewFacts: CompanyDetailFact[]
  primaryCta: 'invite-member' | null
  sectionFlags: CompanyDetailSectionFlags
}

const EMPTY_VALUE = '—'

export function formatCompanyDate(value: Date | null | undefined, withTime = false): string | null {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(value)
}

export function formatCompanyRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function getCompanyPrimaryCta(permissions: CompanyDetailPermissions): 'invite-member' | null {
  return permissions.canInvite ? 'invite-member' : null
}

export function getCompanyDetailSectionFlags(permissions: CompanyDetailPermissions): CompanyDetailSectionFlags {
  return {
    showActivitySection: permissions.canViewActivity,
    showPrimaryInvite: permissions.canInvite,
    showSecondaryEdit: permissions.canUpdate,
    showSecondaryStatus: permissions.canUpdateStatus,
    canManageInvitations: permissions.canInvite,
    canManageMemberships: permissions.canUpdateMemberships,
  }
}

function toDisplayValue(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : EMPTY_VALUE
}

export function buildCompanyDetailViewModel(
  detail: CompanyDetailPayload,
  permissions: CompanyDetailPermissions,
): CompanyDetailViewModel {
  const activeMembers = detail.members.filter((member) => member.isActive)
  const inactiveMembers = detail.members.filter((member) => !member.isActive)
  const pendingInvitations = detail.invitations.filter((invitation) => invitation.status === 'PENDING')
  const recentActivity = detail.activity?.slice(0, 5) ?? []
  const updatedAtLabel = formatCompanyDate(detail.company.updatedAt)
  const createdAtLabel = formatCompanyDate(detail.company.createdAt)
  const slugLabel = detail.company.slug ? `/${detail.company.slug}` : null

  return {
    activeMembers,
    inactiveMembers,
    pendingInvitations,
    recentActivity,
    overviewMetrics: [
      {
        label: 'Miembros activos',
        value: String(activeMembers.length),
        hint: 'Usuarios habilitados para operar hoy en esta company.',
      },
      {
        label: 'Invitaciones pendientes',
        value: String(pendingInvitations.length),
        hint: 'Pendientes de aceptación o seguimiento operativo.',
      },
      {
        label: 'Membresías inactivas',
        value: String(inactiveMembers.length),
        hint: 'Accesos pausados que conservan trazabilidad.',
      },
      {
        label: 'Última actualización',
        value: toDisplayValue(updatedAtLabel),
        hint: slugLabel ? `Slug operativo: ${slugLabel}` : 'Sin slug operativo registrado.',
      },
    ],
    overviewFacts: [
      {
        label: 'Slug operativo',
        value: toDisplayValue(slugLabel),
      },
      {
        label: 'Estado actual',
        value: detail.company.isActive ? 'Activa' : 'Inactiva',
      },
      {
        label: 'Creada',
        value: toDisplayValue(createdAtLabel),
      },
      {
        label: 'Actualizada',
        value: toDisplayValue(updatedAtLabel),
      },
    ],
    primaryCta: getCompanyPrimaryCta(permissions),
    sectionFlags: getCompanyDetailSectionFlags(permissions),
  }
}
