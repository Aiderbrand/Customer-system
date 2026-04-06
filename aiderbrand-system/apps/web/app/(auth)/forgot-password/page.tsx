"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { useAuth } from "@/contexts/auth-context"

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await forgotPassword(email)
      setMessage(response.message)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar el reseteo."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell
      title="Recuperar contraseña"
      description="Ingresá tu email y te enviaremos un enlace para definir una nueva contraseña si tu cuenta existe."
      footer={
        <Link
          href="/login"
          className="block text-sm text-primary hover:underline"
        >
          Volver al login
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </AuthPageShell>
  )
}
