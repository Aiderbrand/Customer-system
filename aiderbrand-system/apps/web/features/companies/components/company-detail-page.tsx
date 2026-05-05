'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useAuth } from '@/contexts/auth-context'
import {
  CompanyConfirmDialog,
  CompanyFormDialog,
  InviteMemberDialog,
  MembershipRoleDialog,
} from '@/features/companies/components/company-dialogs'
import { InviteClientDialog } from '@/features/companies/components/InviteClientDialog'
import { CompanyActivitySection } from '@/features/companies/components/company-activity-section'
import { CompanyDetailHeader } from '@/features/companies/components/company-detail-header'
import { CompanyDetailOverview } from '@/features/companies/components/company-detail-overview'
import { CompanyProjectsSection } from '@/features/companies/components/company-projects-section'
import { CompanyTeamSection } from '@/features/companies/components/company-team-section'
import {
  buildCompanyDetailViewModel,
  type CompanyDetailPermissions,
} from '@/features/companies/components/company-detail-types'
import { companyService } from '@/lib/services/company-service'
import { getInvitableRoles } from '@/lib/rbac'
import type { CompanyDetailMembershipItem, CompanyDetailPayload, Invitation } from '@/lib/types'

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const { currentRole, hasPermission, actorGroup } = useAuth()
  const [detail, setDetail] = useState<CompanyDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteClientOpen, setInviteClientOpen] = useState(false)
  const [companyStatusDialogOpen, setCompanyStatusDialogOpen] = useState(false)
  const [membershipTarget, setMembershipTarget] = useState<CompanyDetailMembershipItem | null>(null)
  const [membershipRoleTarget, setMembershipRoleTarget] = useState<CompanyDetailMembershipItem | null>(null)
  const [invitationTarget, setInvitationTarget] = useState<Invitation | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteClientSubmitting, setInviteClientSubmitting] = useState(false)
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [membershipSubmitting, setMembershipSubmitting] = useState(false)
  const [invitationSubmitting, setInvitationSubmitting] = useState(false)
  const [membershipRoleSubmitting, setMembershipRoleSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteClientError, setInviteClientError] = useState<string | null>(null)
  const [membershipRoleError, setMembershipRoleError] = useState<string | null>(null)

  const canInvite = hasPermission('companies:invite')
  const canInviteOnboarding = actorGroup === 'internal'
  const canUpdate = hasPermission('companies:update')
  const canUpdateMemberships = hasPermission('companies:memberships:update')
  const canUpdateStatus = hasPermission('companies:status')
  const canViewActivity = hasPermission('companies:activity:view')
  const canCreateProject = hasPermission('companies:create-project')

  const permissions = useMemo<CompanyDetailPermissions>(() => ({
    canInvite,
    canUpdate,
    canUpdateMemberships,
    canUpdateStatus,
    canViewActivity,
  }), [canInvite, canUpdate, canUpdateMemberships, canUpdateStatus, canViewActivity])

  const fetchDetail = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options

    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      const payload = await companyService.getCompanyDetail(companyId)
      setDetail(payload)
    } catch (err) {
      console.error('[CompanyDetailPage] Error fetching company detail', err)
      if (!silent) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle de la company.')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [companyId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const viewModel = useMemo(() => {
    return detail ? buildCompanyDetailViewModel(detail, permissions) : null
  }, [detail, permissions])

  async function handleEditCompany(payload: { name: string; slug?: string }) {
    if (!detail) return

    setEditSubmitting(true)
    setEditError(null)

    try {
      await companyService.updateCompany(detail.company.id, payload)
      toast.success('Company actualizada', {
        description: 'Los cambios ya están disponibles para el equipo interno.',
      })
      setEditOpen(false)
      await fetchDetail({ silent: true })
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo actualizar la company.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleInvite(payload: { email: string; role: 'DELIVERY_SPECIALIST' | 'ACCOUNT_OWNER' | 'COLLABORATOR' | 'PROJECT_LEAD' | 'SYSTEM_ADMIN' }) {
    if (!detail) return

    setInviteSubmitting(true)
    setInviteError(null)

    try {
      const result = await companyService.createInvitation(detail.company.id, payload)
      const isQueued = result.delivery.reason === 'email_queued'
      toast.success(
        result.delivery.sent || isQueued ? 'Invitación enviada' : 'Invitación lista para compartir',
        {
          description: isQueued
            ? 'El email fue encolado y será entregado en breve.'
            : result.delivery.sent
              ? 'La invitación se envió por email y quedó registrada para seguimiento.'
              : result.inviteUrl
                ? `No se pudo enviar el email. Compartí manualmente este enlace: ${result.inviteUrl}`
                : 'La invitación quedó registrada, pero el envío no pudo confirmarse.',
        },
      )
      setInviteOpen(false)
      await fetchDetail({ silent: true })
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'No se pudo enviar la invitación.')
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleInviteClient(payload: { email: string; role: 'ACCOUNT_OWNER'; withOnboarding: true }) {
    if (!detail) return

    setInviteClientSubmitting(true)
    setInviteClientError(null)

    try {
      const result = await companyService.createInvitation(detail.company.id, payload)
      const isQueued = result.delivery.reason === 'email_queued'
      toast.success(
        result.delivery.sent || isQueued ? 'Invitación de onboarding enviada' : 'Invitación lista para compartir',
        {
          description: isQueued
            ? 'El email de onboarding fue encolado y será entregado en breve.'
            : result.delivery.sent
              ? 'El cliente recibirá un email para completar su registro y formulario inicial.'
              : result.inviteUrl
                ? `No se pudo enviar el email. Compartí manualmente este enlace: ${result.inviteUrl}`
                : 'La invitación quedó registrada, pero el envío no pudo confirmarse.',
        },
      )
      setInviteClientOpen(false)
      await fetchDetail({ silent: true })
    } catch (err) {
      setInviteClientError(err instanceof Error ? err.message : 'No se pudo enviar la invitación de onboarding.')
    } finally {
      setInviteClientSubmitting(false)
    }
  }

  async function handleUpdateMembershipRole(role: CompanyDetailMembershipItem['role']) {
    if (!detail || !membershipRoleTarget) return

    setMembershipRoleSubmitting(true)
    setMembershipRoleError(null)

    try {
      await companyService.updateMembershipRole(detail.company.id, membershipRoleTarget.userId, role)
      toast.success('Rol actualizado')
      setMembershipRoleTarget(null)
      await fetchDetail({ silent: true })
    } catch (err) {
      setMembershipRoleError(err instanceof Error ? err.message : 'No se pudo actualizar el rol.')
    } finally {
      setMembershipRoleSubmitting(false)
    }
  }

  async function handleToggleCompanyStatus() {
    if (!detail) return

    setStatusSubmitting(true)

    try {
      await companyService.updateCompanyStatus(detail.company.id, detail.company.isActive ? 'inactive' : 'active')
      toast.success(detail.company.isActive ? 'Company desactivada' : 'Company reactivada')
      setCompanyStatusDialogOpen(false)
      await fetchDetail({ silent: true })
    } finally {
      setStatusSubmitting(false)
    }
  }

  async function handleToggleMembership() {
    if (!detail || !membershipTarget) return

    setMembershipSubmitting(true)

    try {
      await companyService.updateMembershipStatus(detail.company.id, membershipTarget.userId, !membershipTarget.isActive)
      toast.success(membershipTarget.isActive ? 'Membresía desactivada' : 'Membresía reactivada')
      setMembershipTarget(null)
      await fetchDetail({ silent: true })
    } finally {
      setMembershipSubmitting(false)
    }
  }

  async function handleRevokeInvitation() {
    if (!detail || !invitationTarget) return

    setInvitationSubmitting(true)

    try {
      await companyService.revokeInvitation(detail.company.id, invitationTarget.id)
      toast.success('Invitación revocada')
      setInvitationTarget(null)
      await fetchDetail({ silent: true })
    } finally {
      setInvitationSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6" data-testid="company-detail-loading">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (error || !detail || !viewModel) {
    return (
      <EmptyState
        icon={Building2}
        title="No pudimos cargar esta company"
        description={error ?? 'La company solicitada no está disponible o no tenés acceso.'}
        action={<Button variant="outline" onClick={() => fetchDetail()}>Reintentar</Button>}
      />
    )
  }

  const invitableRoles = currentRole ? getInvitableRoles(currentRole) : []

  return (
    <>
      <div className="flex flex-col gap-6">
        <CompanyDetailHeader
          companyName={detail.company.name}
          companySlug={detail.company.slug}
          isActive={detail.company.isActive}
          canInvite={viewModel.sectionFlags.showPrimaryInvite}
          canInviteClient={canInviteOnboarding}
          canEdit={viewModel.sectionFlags.showSecondaryEdit}
          canUpdateStatus={viewModel.sectionFlags.showSecondaryStatus}
          onInvite={() => setInviteOpen(true)}
          onInviteClient={() => setInviteClientOpen(true)}
          onEdit={() => setEditOpen(true)}
          onToggleStatus={() => setCompanyStatusDialogOpen(true)}
        />

        <CompanyDetailOverview
          metrics={viewModel.overviewMetrics}
          facts={viewModel.overviewFacts}
        />

        <CompanyTeamSection
          activeMembers={viewModel.activeMembers}
          inactiveMembers={viewModel.inactiveMembers}
          invitations={detail.invitations}
          canToggleMemberships={viewModel.sectionFlags.canManageMemberships}
          canUpdateRoles={canUpdateMemberships}
          canRevokeInvitations={viewModel.sectionFlags.canManageInvitations}
          onToggleMembership={setMembershipTarget}
          onUpdateRole={setMembershipRoleTarget}
          onRevokeInvitation={setInvitationTarget}
        />

        <CompanyProjectsSection
          companyId={detail.company.id}
          companyName={detail.company.name}
          canCreateProject={canCreateProject}
          onProjectCreated={() => fetchDetail({ silent: true })}
        />

        {viewModel.sectionFlags.showActivitySection ? (
          <CompanyActivitySection items={detail.activity ?? []} />
        ) : null}
      </div>

      <CompanyFormDialog
        open={editOpen}
        mode="edit"
        company={detail.company}
        submitting={editSubmitting}
        error={editError}
        onOpenChange={setEditOpen}
        onSubmit={handleEditCompany}
      />

      <InviteMemberDialog
        open={inviteOpen}
        companyName={detail.company.name}
        allowedRoles={invitableRoles}
        submitting={inviteSubmitting}
        error={inviteError}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
      />

      <InviteClientDialog
        open={inviteClientOpen}
        companyName={detail.company.name}
        submitting={inviteClientSubmitting}
        error={inviteClientError}
        onOpenChange={setInviteClientOpen}
        onSubmit={(payload) => void handleInviteClient(payload)}
      />

      <MembershipRoleDialog
        open={Boolean(membershipRoleTarget)}
        memberName={membershipRoleTarget?.user.name ?? null}
        currentRole={membershipRoleTarget?.role ?? null}
        allowedRoles={invitableRoles}
        submitting={membershipRoleSubmitting}
        error={membershipRoleError}
        onOpenChange={(open) => {
          if (!open) {
            setMembershipRoleTarget(null)
            setMembershipRoleError(null)
          }
        }}
        onSubmit={({ role }) => void handleUpdateMembershipRole(role)}
      />

      <CompanyConfirmDialog
        open={companyStatusDialogOpen}
        title={detail.company.isActive ? 'Desactivar company' : 'Reactivar company'}
        description={detail.company.isActive
          ? 'La company dejará de estar disponible para operación activa, pero conservará trazabilidad y podrá reactivarse después.'
          : 'La company volverá a quedar disponible para el equipo interno.'}
        confirmLabel={detail.company.isActive ? 'Desactivar' : 'Reactivar'}
        tone={detail.company.isActive ? 'destructive' : 'default'}
        submitting={statusSubmitting}
        onOpenChange={setCompanyStatusDialogOpen}
        onConfirm={() => void handleToggleCompanyStatus()}
      />

      <CompanyConfirmDialog
        open={Boolean(membershipTarget)}
        title={membershipTarget?.isActive ? 'Desactivar membresía' : 'Reactivar membresía'}
        description={membershipTarget
          ? `${membershipTarget.user.name} ${membershipTarget.isActive ? 'perderá' : 'recuperará'} acceso operativo a esta company.`
          : ''}
        confirmLabel={membershipTarget?.isActive ? 'Desactivar acceso' : 'Reactivar acceso'}
        tone={membershipTarget?.isActive ? 'destructive' : 'default'}
        submitting={membershipSubmitting}
        onOpenChange={(open) => {
          if (!open) setMembershipTarget(null)
        }}
        onConfirm={() => void handleToggleMembership()}
      />

      <CompanyConfirmDialog
        open={Boolean(invitationTarget)}
        title="Revocar invitación"
        description={invitationTarget ? `La invitación para ${invitationTarget.email} dejará de estar disponible para aceptación.` : ''}
        confirmLabel="Revocar invitación"
        tone="destructive"
        submitting={invitationSubmitting}
        onOpenChange={(open) => {
          if (!open) setInvitationTarget(null)
        }}
        onConfirm={() => void handleRevokeInvitation()}
      />
    </>
  )
}
