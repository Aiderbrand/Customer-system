import { Mail, UserCog, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import type { CompanyDetailMembershipItem, Invitation } from '@/lib/types'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCompanyDate, formatCompanyRole, getUserInitials } from './company-detail-types'

interface CompanyTeamSectionProps {
  activeMembers: CompanyDetailMembershipItem[]
  inactiveMembers: CompanyDetailMembershipItem[]
  invitations: Invitation[]
  canToggleMemberships: boolean
  canUpdateRoles: boolean
  canRevokeInvitations: boolean
  onToggleMembership: (item: CompanyDetailMembershipItem) => void
  onUpdateRole: (item: CompanyDetailMembershipItem) => void
  onRevokeInvitation: (item: Invitation) => void
}

function formatInvitationStatus(status: Invitation['status']): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente'
    case 'ACCEPTED':
      return 'Aceptada'
    case 'REVOKED':
      return 'Revocada'
    case 'EXPIRED':
      return 'Expirada'
    default:
      return status
  }
}

export function CompanyTeamSection({
  activeMembers,
  inactiveMembers,
  invitations,
  canToggleMemberships,
  canUpdateRoles,
  canRevokeInvitations,
  onToggleMembership,
  onUpdateRole,
  onRevokeInvitation,
}: CompanyTeamSectionProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="company-team-title">
      <div className="flex flex-col gap-1">
        <h2 id="company-team-title" className="text-xl font-semibold tracking-tight">Team & access</h2>
        <p className="text-sm text-muted-foreground">Operación de miembros e invitaciones con lectura cómoda en desktop y mobile.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MemberPanel
          title="Equipo activo"
          description="Miembros habilitados para operar hoy dentro de la company."
          emptyTitle="Sin miembros activos"
          emptyDescription="Todavía no hay membresías activas para mostrar."
          items={activeMembers}
          canToggle={canToggleMemberships}
          canUpdateRoles={canUpdateRoles}
          onToggle={onToggleMembership}
          onUpdateRole={onUpdateRole}
          testIdPrefix="active-members"
        />

        <MemberPanel
          title="Membresías inactivas"
          description="Historial de accesos pausados o deshabilitados."
          emptyTitle="Sin membresías inactivas"
          emptyDescription="No hay accesos pausados registrados para esta company."
          items={inactiveMembers}
          canToggle={canToggleMemberships}
          canUpdateRoles={canUpdateRoles}
          onToggle={onToggleMembership}
          onUpdateRole={onUpdateRole}
          testIdPrefix="inactive-members"
        />

        <InvitationPanel
          title="Invitaciones"
          description="Seguimiento de invitaciones vigentes y su estado actual."
          items={invitations}
          canRevoke={canRevokeInvitations}
          onRevoke={onRevokeInvitation}
        />
      </div>
    </section>
  )
}

function MemberPanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
  canToggle,
  canUpdateRoles,
  onToggle,
  onUpdateRole,
  testIdPrefix,
}: {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  items: CompanyDetailMembershipItem[]
  canToggle: boolean
  canUpdateRoles: boolean
  onToggle: (item: CompanyDetailMembershipItem) => void
  onUpdateRole: (item: CompanyDetailMembershipItem) => void
  testIdPrefix: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={Users} title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <div className="hidden md:block" data-testid={`${testIdPrefix}-desktop-table`}>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Miembro</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Actualizada</TableHead>
                      <TableHead className="w-[220px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((member) => (
                      <TableRow key={`${member.companyId}-${member.userId}`}>
                        <TableCell>
                          <div className="flex items-center gap-3 py-1">
                            <Avatar className="size-9">
                              {member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt={member.user.name} /> : null}
                              <AvatarFallback>{getUserInitials(member.user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground">{member.user.name}</span>
                              <span className="text-xs text-muted-foreground">{member.user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCompanyRole(member.role)}</TableCell>
                        <TableCell>
                          <Badge variant={member.isActive ? 'secondary' : 'outline'}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>{formatCompanyDate(member.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          {canToggle || canUpdateRoles ? (
                            <div className="flex justify-end gap-2">
                              {canUpdateRoles ? (
                                <Button variant="outline" size="sm" onClick={() => onUpdateRole(member)}>
                                  Cambiar rol
                                </Button>
                              ) : null}
                              {canToggle ? (
                                <Button variant="outline" size="sm" onClick={() => onToggle(member)}>
                                  <UserCog />
                                  {member.isActive ? 'Desactivar' : 'Reactivar'}
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:hidden" data-testid={`${testIdPrefix}-mobile-list`}>
              {items.map((member) => (
                <div key={`${member.companyId}-${member.userId}`} className="flex flex-col gap-3 rounded-xl border bg-muted/10 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt={member.user.name} /> : null}
                      <AvatarFallback>{getUserInitials(member.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="font-medium text-foreground">{member.user.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                    <Badge variant={member.isActive ? 'secondary' : 'outline'}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaItem label="Rol" value={formatCompanyRole(member.role)} />
                    <MetaItem label="Actualizada" value={formatCompanyDate(member.updatedAt) ?? '—'} />
                  </div>
                  {canUpdateRoles || canToggle ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {canUpdateRoles ? (
                        <Button variant="outline" size="sm" onClick={() => onUpdateRole(member)}>
                          Cambiar rol
                        </Button>
                      ) : null}
                      {canToggle ? (
                        <Button variant="outline" size="sm" onClick={() => onToggle(member)}>
                          <UserCog />
                          {member.isActive ? 'Desactivar acceso' : 'Reactivar acceso'}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function InvitationPanel({
  title,
  description,
  items,
  canRevoke,
  onRevoke,
}: {
  title: string
  description: string
  items: Invitation[]
  canRevoke: boolean
  onRevoke: (item: Invitation) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={Mail} title="Sin invitaciones registradas" description="No hay invitaciones creadas para esta company." />
        ) : (
          <>
            <div className="hidden md:block" data-testid="invitations-desktop-table">
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="w-[132px] text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium text-foreground">{invitation.email}</TableCell>
                        <TableCell>{formatCompanyRole(invitation.role)}</TableCell>
                        <TableCell>
                          <Badge variant={invitation.status === 'PENDING' ? 'secondary' : 'outline'}>{formatInvitationStatus(invitation.status)}</Badge>
                        </TableCell>
                        <TableCell>{formatCompanyDate(invitation.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {canRevoke && invitation.status === 'PENDING' ? (
                            <Button variant="outline" size="sm" onClick={() => onRevoke(invitation)}>
                              Revocar
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:hidden" data-testid="invitations-mobile-list">
              {items.map((invitation) => (
                <div key={invitation.id} className="flex flex-col gap-3 rounded-xl border bg-muted/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="break-all font-medium text-foreground">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">{formatCompanyRole(invitation.role)}</p>
                    </div>
                    <Badge variant={invitation.status === 'PENDING' ? 'secondary' : 'outline'}>{formatInvitationStatus(invitation.status)}</Badge>
                  </div>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaItem label="Creada" value={formatCompanyDate(invitation.createdAt) ?? '—'} />
                    <MetaItem label="Expira" value={formatCompanyDate(invitation.expiresAt) ?? '—'} />
                  </div>
                  {canRevoke && invitation.status === 'PENDING' ? (
                    <Button variant="outline" size="sm" onClick={() => onRevoke(invitation)}>
                      Revocar invitación
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
