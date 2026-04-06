import type { CompanyDetailPayload } from '@/lib/types'
import {
  buildCompanyDetailViewModel,
  formatCompanyRole,
  getCompanyPrimaryCta,
  type CompanyDetailPermissions,
} from './company-detail-types'

function createPermissions(overrides: Partial<CompanyDetailPermissions> = {}): CompanyDetailPermissions {
  return {
    canInvite: true,
    canUpdate: true,
    canUpdateMemberships: true,
    canUpdateStatus: true,
    canViewActivity: true,
    ...overrides,
  }
}

function createDetailPayload(): CompanyDetailPayload {
  return {
    company: {
      id: 'comp-1',
      name: 'Aiderbrand',
      slug: 'aiderbrand',
      isActive: true,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-03T12:00:00.000Z'),
      activeMemberCount: 2,
      pendingInvitationCount: 1,
    },
    members: [
      {
        userId: 'user-1',
        companyId: 'comp-1',
        role: 'PROJECT_LEAD',
        isActive: true,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-03T10:00:00.000Z'),
        user: {
          id: 'user-1',
          email: 'lead@example.com',
          name: 'Lead User',
          avatarUrl: null,
        },
      },
      {
        userId: 'user-2',
        companyId: 'comp-1',
        role: 'COLLABORATOR',
        isActive: false,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-04T10:00:00.000Z'),
        user: {
          id: 'user-2',
          email: 'collab@example.com',
          name: 'Collab User',
          avatarUrl: null,
        },
      },
    ],
    invitations: [
      {
        id: 'inv-1',
        companyId: 'comp-1',
        email: 'pending@example.com',
        role: 'DELIVERY_SPECIALIST',
        status: 'PENDING',
        expiresAt: new Date('2026-04-10T10:00:00.000Z'),
        createdById: 'user-1',
        acceptedAt: null,
        revokedAt: null,
        createdAt: new Date('2026-04-03T09:00:00.000Z'),
      },
      {
        id: 'inv-2',
        companyId: 'comp-1',
        email: 'accepted@example.com',
        role: 'COLLABORATOR',
        status: 'ACCEPTED',
        expiresAt: new Date('2026-04-08T10:00:00.000Z'),
        createdById: 'user-1',
        acceptedAt: new Date('2026-04-04T09:00:00.000Z'),
        revokedAt: null,
        createdAt: new Date('2026-04-02T09:00:00.000Z'),
      },
    ],
    projects: [],
    activity: Array.from({ length: 6 }, (_, index) => ({
      id: `act-${index + 1}`,
      action: `ACTION_${index + 1}`,
      entityType: 'COMPANY',
      entityId: 'comp-1',
      actorId: `user-${index + 1}`,
      createdAt: new Date(`2026-04-0${index + 1}T10:00:00.000Z`),
      metadata: null,
    })),
  }
}

describe('company-detail-types', () => {
  it('derives counters, activity slice and CTA from the real payload', () => {
    const viewModel = buildCompanyDetailViewModel(createDetailPayload(), createPermissions())

    expect(viewModel.activeMembers).toHaveLength(1)
    expect(viewModel.inactiveMembers).toHaveLength(1)
    expect(viewModel.pendingInvitations).toHaveLength(1)
    expect(viewModel.recentActivity).toHaveLength(5)
    expect(viewModel.primaryCta).toBe('invite-member')
    expect(viewModel.overviewMetrics[0]).toEqual(expect.objectContaining({
      label: 'Miembros activos',
      value: '1',
    }))
    expect(formatCompanyRole('PROJECT_LEAD')).toBe('Project Lead')
  })

  it('keeps the primary CTA absent when invite permission is missing', () => {
    expect(getCompanyPrimaryCta(createPermissions({ canInvite: false }))).toBeNull()
  })

  it('hides activity through section flags when the user lacks permission', () => {
    const viewModel = buildCompanyDetailViewModel(
      createDetailPayload(),
      createPermissions({ canViewActivity: false, canInvite: false }),
    )

    expect(viewModel.sectionFlags.showActivitySection).toBe(false)
    expect(viewModel.sectionFlags.showPrimaryInvite).toBe(false)
  })

  it('keeps overview values honest when optional display data is absent', () => {
    const detail = createDetailPayload()
    const payloadWithMissingDisplayValues = {
      ...detail,
      company: {
        ...detail.company,
        slug: '',
        updatedAt: undefined as unknown as Date,
      },
    } satisfies CompanyDetailPayload

    const viewModel = buildCompanyDetailViewModel(payloadWithMissingDisplayValues, createPermissions())

    expect(viewModel.overviewMetrics[3]).toEqual(expect.objectContaining({
      label: 'Última actualización',
      value: '—',
      hint: 'Sin slug operativo registrado.',
    }))
    expect(viewModel.overviewFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Slug operativo', value: '—' }),
      expect.objectContaining({ label: 'Actualizada', value: '—' }),
    ]))
  })
})
