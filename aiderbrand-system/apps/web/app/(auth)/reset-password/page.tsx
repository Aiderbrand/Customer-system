"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { useAuth } from "@/contexts/auth-context"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resetPassword } = useAuth()

  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await resetPassword(token, password)
      setMessage(response.message)
      setTimeout(() => router.replace("/login"), 1200)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell
      title="Definir nueva contraseña"
      description="Elegí una nueva contraseña para recuperar el acceso a tu cuenta."
      footer={
        <Link
          href="/login"
          className="block text-sm text-primary hover:underline"
        >
          Volver al login
        </Link>
      }
    >
      {!token ? (
        <Alert variant="destructive">
          <AlertDescription>
            Falta el token de reseteo en la URL.
          </AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !token}
        >
          {submitting ? "Guardando…" : "Actualizar contraseña"}
        </Button>
      </form>
    </AuthPageShell>
  )
}
