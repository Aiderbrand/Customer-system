'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Button } from '@workspace/ui/components/button'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { AuthPageShell } from '@/components/auth/auth-page-shell'
import { useAuth } from '@/contexts/auth-context'

export default function AcceptInvitationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { acceptInvitation, validateInvitationToken } = useAuth()

  const token = typeof params?.token === 'string' ? params.token : ''

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [invitationInfo, setInvitationInfo] = useState<Awaited<ReturnType<typeof validateInvitationToken>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Token de invitación inválido.')
      return
    }

    let cancelled = false

    void validateInvitationToken(token)
      .then((response) => {
        if (!cancelled) {
          setInvitationInfo(response)
          setName(response.email.split('@')[0] ?? '')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo validar la invitación.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, validateInvitationToken])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await acceptInvitation({ token, name, password })
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell
      title="Aceptar invitación"
      description="Completá tu nombre y definí la contraseña inicial."
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {invitationInfo ? (
            <Alert>
              <AlertDescription>
                Invitación para <strong>{invitationInfo.email}</strong> con rol <strong>{invitationInfo.role}</strong>.
              </AlertDescription>
            </Alert>
          ) : null}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Activando cuenta…' : 'Aceptar invitación'}
            </Button>
          </form>
        </>
      )}
    </AuthPageShell>
  )
}
