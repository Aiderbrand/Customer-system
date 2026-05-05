'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Button } from '@workspace/ui/components/button'
import { type Step3Data, type TeamInvite, teamInviteSchema } from '../schemas/onboarding.schema'

const DEFAULT_TEAM_ROLE: TeamInvite['role'] = teamInviteSchema.shape.role.options[0]

interface Step3TeamProps {
  initialData?: Partial<Step3Data>
  onNext: (data: Step3Data) => void
  onBack: () => void
  onSkip: () => void
  submitting?: boolean
}

export function Step3Team({ initialData, onNext, onBack, onSkip, submitting = false }: Step3TeamProps) {
  const [invites, setInvites] = useState<TeamInvite[]>(initialData?.teamInvites ?? [])
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  function addInvite() {
    const emailSchema = z.string().email()
    const result = emailSchema.safeParse(email.trim())

    if (!result.success) {
      setEmailError('Ingresá un email válido')
      return
    }

    if (invites.some((inv) => inv.email === email.trim())) {
      setEmailError('Este email ya está en la lista')
      return
    }

    setInvites((prev) => [...prev, { email: email.trim(), role: DEFAULT_TEAM_ROLE }])
    setEmail('')
    setEmailError(null)
  }

  function removeInvite(emailToRemove: string) {
    setInvites((prev) => prev.filter((inv) => inv.email !== emailToRemove))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onNext({ teamInvites: invites })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          ¿Querés dar acceso al sistema a alguien de tu equipo?
        </p>
        <p className="text-sm text-muted-foreground">
          Este paso es <strong>completamente opcional</strong>. Si invitás a alguien acá,
          va a recibir un email para crear su cuenta y acceder a la plataforma con el rol que elijas.
          También podés hacerlo después desde la configuración.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-dashed bg-muted/30 p-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label className="text-xs">Email del colaborador</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addInvite()
              }
            }}
            placeholder="colaborador@empresa.com"
            className={emailError ? 'border-destructive' : ''}
          />
          {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInvite}
            disabled={!email.trim()}
          >
            + Agregar
          </Button>
        </div>
      </div>

      {invites.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Invitaciones pendientes ({invites.length})
          </p>
          {invites.map((inv) => (
            <div key={inv.email} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {inv.email[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">Colaborador</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInvite(inv.email)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? 'Finalizando onboarding...'
            : invites.length > 0
              ? `Finalizar e invitar (${invites.length})`
              : 'Finalizar onboarding'}
        </Button>

        <Button
          type="button"
          variant="link"
          onClick={onSkip}
          disabled={submitting}
          className="text-sm text-muted-foreground"
        >
          Saltar este paso, invitaré luego
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="text-muted-foreground"
        >
          Atrás
        </Button>
      </div>
    </form>
  )
}
