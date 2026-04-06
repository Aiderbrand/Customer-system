'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import type { CompanyHubItem, Role } from '@/lib/types'

const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_LEAD: 'Project Lead',
  DELIVERY_SPECIALIST: 'Delivery Specialist',
  ACCOUNT_OWNER: 'Account Owner',
  COLLABORATOR: 'Collaborator',
}

function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role]
}

interface CompanyFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  company?: CompanyHubItem | null
  submitting?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { name: string; slug?: string }) => void
}

export function CompanyFormDialog({
  open,
  mode,
  company,
  submitting = false,
  error = null,
  onOpenChange,
  onSubmit,
}: CompanyFormDialogProps) {
  const [name, setName] = useState(company?.name ?? '')
  const [slug, setSlug] = useState(company?.slug ?? '')
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(company?.name ?? '')
    setSlug(company?.slug ?? '')
  }, [company?.name, company?.slug, open])

  const isDirty = useMemo(() => {
    return name !== (company?.name ?? '') || slug !== (company?.slug ?? '')
  }, [company?.name, company?.slug, name, slug])

  function requestClose() {
    if (!isDirty || submitting) {
      onOpenChange(false)
      return
    }

    setConfirmDiscardOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Nueva company' : 'Editar company'}</DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Registrá una company para habilitar operación, membresías e invitaciones con trazabilidad completa.'
                : 'Actualizá los datos operativos visibles para el equipo interno.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name">Nombre</Label>
              <Input id="company-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-slug">Slug</Label>
              <Input
                id="company-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="Se genera automáticamente si lo dejás vacío"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={requestClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => onSubmit({ name: name.trim(), slug: slug.trim() || undefined })} disabled={submitting || !name.trim()}>
              {submitting ? 'Guardando...' : mode === 'create' ? 'Crear company' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}

interface InviteMemberDialogProps {
  open: boolean
  companyName: string | null
  allowedRoles: Role[]
  submitting?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { email: string; role: Role }) => void
}

export function InviteMemberDialog({
  open,
  companyName,
  allowedRoles,
  submitting = false,
  error = null,
  onOpenChange,
  onSubmit,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(allowedRoles[0] ?? 'COLLABORATOR')
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const roleOptions = useMemo(
    () => allowedRoles.map((value) => ({ value, label: getRoleLabel(value) })),
    [allowedRoles],
  )

  useEffect(() => {
    if (!open) return
    setEmail('')
    setRole(allowedRoles[0] ?? 'COLLABORATOR')
  }, [allowedRoles, open])

  const defaultRole = allowedRoles[0] ?? 'COLLABORATOR'
  const isDirty = email.trim().length > 0 || role !== defaultRole

  function requestClose() {
    if (!isDirty || submitting) {
      onOpenChange(false)
      return
    }

    setConfirmDiscardOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
            <DialogDescription>
              {companyName
                ? `Enviá una invitación a ${companyName} con el rol operativo correspondiente.`
                : 'Enviá una invitación con el rol operativo correspondiente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Rol</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Seleccioná un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={requestClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => onSubmit({ email: email.trim(), role })} disabled={submitting || !email.trim() || roleOptions.length === 0}>
              {submitting ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}

interface MembershipRoleDialogProps {
  open: boolean
  memberName: string | null
  currentRole: Role | null
  allowedRoles: Role[]
  submitting?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { role: Role }) => void
}

export function MembershipRoleDialog({
  open,
  memberName,
  currentRole,
  allowedRoles,
  submitting = false,
  error = null,
  onOpenChange,
  onSubmit,
}: MembershipRoleDialogProps) {
  const [role, setRole] = useState<Role>(currentRole ?? allowedRoles[0] ?? 'COLLABORATOR')
  const roleOptions = useMemo(
    () => allowedRoles.map((value) => ({ value, label: getRoleLabel(value) })),
    [allowedRoles],
  )

  useEffect(() => {
    if (!open) return
    setRole(currentRole ?? allowedRoles[0] ?? 'COLLABORATOR')
  }, [allowedRoles, currentRole, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
          <DialogDescription>
            {memberName
              ? `Actualizá el rol operativo de ${memberName} dentro de esta company.`
              : 'Actualizá el rol operativo de esta membresía.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="membership-role">Rol</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="membership-role">
                <SelectValue placeholder="Seleccioná un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit({ role })} disabled={submitting || roleOptions.length === 0 || role === currentRole}>
            {submitting ? 'Guardando...' : 'Guardar rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CompanyConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  submitting?: boolean
  tone?: 'default' | 'destructive'
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function CompanyConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  submitting = false,
  tone = 'default',
  onOpenChange,
  onConfirm,
}: CompanyConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant={tone === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Procesando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
