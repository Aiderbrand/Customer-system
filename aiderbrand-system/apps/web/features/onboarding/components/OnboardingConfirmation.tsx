'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'

interface OnboardingConfirmationProps {
  companyName: string
  projectName?: string
  teamInvitesCount?: number
}

export function OnboardingConfirmation({ companyName, projectName, teamInvitesCount = 0 }: OnboardingConfirmationProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          router.replace('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="flex flex-col items-center gap-8 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Todo listo, {companyName.split(' ')[0]}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tu cuenta está activada y tu información está en manos del equipo AIDERBRAND.
          Vamos a ponernos en contacto pronto para arrancar.
        </p>
      </div>

      <div className="w-full">
        <Separator className="mb-4" />
        <div className="flex flex-col gap-2 text-left">
          <SummaryItem label="Empresa" value={companyName} />
          {projectName ? <SummaryItem label="Proyecto" value={projectName} /> : null}
          {teamInvitesCount > 0 ? (
            <SummaryItem
              label="Invitaciones enviadas"
              value={`${teamInvitesCount} ${teamInvitesCount === 1 ? 'persona' : 'personas'}`}
            />
          ) : null}
        </div>
        <Separator className="mt-4" />
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button onClick={() => router.replace('/dashboard')} className="w-full">
          Ir al dashboard ahora
        </Button>
        <p className="text-xs text-muted-foreground">
          Redirigiendo automáticamente en {countdown}s...
        </p>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
