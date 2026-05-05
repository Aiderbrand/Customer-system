'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { useAuth } from '@/contexts/auth-context'
import { OnboardingStepper } from '@/features/onboarding/components/OnboardingStepper'
import type { OnboardingTokenInfo } from '@/lib/api/auth'

export default function OnboardingPage() {
  const params = useParams<{ token: string }>()
  const { validateOnboardingToken } = useAuth()
  const token = typeof params?.token === 'string' ? params.token : ''

  const [info, setInfo] = useState<OnboardingTokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('El enlace de onboarding es inválido o está incompleto.')
      setLoading(false)
      return
    }

    let cancelled = false

    void validateOnboardingToken(token)
      .then((data) => { if (!cancelled) setInfo(data) })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Este enlace de onboarding no es válido o ya fue utilizado.',
          )
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [token, validateOnboardingToken])

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col items-center justify-center gap-8">
        <Link href="/login" className="inline-flex items-center justify-center" aria-label="Aiderbrand">
          <img src="/logo_light.png" alt="Aiderbrand" className="block h-7 w-auto dark:hidden" />
          <img src="/logo_dark.png" alt="Aiderbrand" className="hidden h-7 w-auto dark:block" />
        </Link>

        {loading ? (
          <OnboardingLoadingSkeleton />
        ) : error ? (
          <OnboardingError message={error} />
        ) : info ? (
          <Card className="w-full border-border/80 bg-background/95 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">{info.companyName}</CardTitle>
              <CardDescription>
                Completá los siguientes pasos para activar tu cuenta y ayudarnos a entender
                tu negocio. Tardás menos de 5 minutos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingStepper
                token={token}
                email={info.email}
                companyName={info.companyName}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}

function OnboardingLoadingSkeleton() {
  return (
    <Card className="w-full border-border/80 bg-background/95 shadow-sm">
      <CardHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex justify-between">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

function OnboardingError({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-md border-border/80 bg-background/95 shadow-sm">
      <CardHeader className="text-center">
        <CardTitle>Este enlace no está disponible</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            Si creés que esto es un error, contactá al equipo AIDERBRAND o pedí que te reenvíen
            la invitación.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
