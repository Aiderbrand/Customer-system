'use client'

import { useEffect, useState } from 'react'
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
import { Badge } from '@workspace/ui/components/badge'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'

interface InviteClientDialogProps {
  open: boolean
  companyName?: string | null
  submitting?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { email: string; role: 'ACCOUNT_OWNER'; withOnboarding: true }) => void
}

export function InviteClientDialog({
  open,
  companyName,
  submitting = false,
  error = null,
  onOpenChange,
  onSubmit,
}: InviteClientDialogProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setEmailError(null)
  }, [open])

  function validateEmail(value: string): string | null {
    if (!value.trim()) return 'El email es requerido'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) return 'Ingresá un email válido'
    return null
  }

  function handleSubmit() {
    const err = validateEmail(email)
    if (err) {
      setEmailError(err)
      return
    }
    onSubmit({ email: email.trim(), role: 'ACCOUNT_OWNER', withOnboarding: true })
  }

  function requestClose() {
    if (submitting) return
    if (email.trim().length > 0) {
      setConfirmDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Invitar cliente al onboarding</DialogTitle>
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Onboarding
              </Badge>
            </div>
            <DialogDescription>
              {companyName
                ? `El cliente de ${companyName} recibirá un email para completar su registro y formulario inicial.`
                : 'El cliente recibirá un email para completar su registro y formulario inicial.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                ◈
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Rol asignado: Account Owner</p>
                <p className="text-xs text-muted-foreground">
                  Acceso completo a la cuenta. No modificable en esta etapa.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-invite-email">Email del cliente</Label>
              <Input
                id="client-invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError(null)
                }}
                onBlur={() => {
                  const err = validateEmail(email)
                  setEmailError(err)
                }}
                placeholder="cliente@empresa.com"
                className={emailError ? 'border-destructive' : ''}
                disabled={submitting}
              />
              {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={requestClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !email.trim()}>
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
