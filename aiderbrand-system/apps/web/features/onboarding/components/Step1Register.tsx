'use client'

import { useState } from 'react'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { step1Schema, type Step1Data } from '../schemas/onboarding.schema'

interface Step1RegisterProps {
  email: string
  initialData?: Partial<Step1Data>
  onNext: (data: Step1Data) => void
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (password.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Débil', color: 'bg-destructive' }
  if (score <= 2) return { score, label: 'Regular', color: 'bg-amber-500' }
  if (score <= 3) return { score, label: 'Buena', color: 'bg-yellow-400' }
  return { score, label: 'Fuerte', color: 'bg-emerald-500' }
}

export function Step1Register({ email, initialData, onNext }: Step1RegisterProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [confirmPassword, setConfirmPassword] = useState(initialData?.confirmPassword ?? '')
  const [errors, setErrors] = useState<Partial<Record<keyof Step1Data, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Step1Data, boolean>>>({})

  const strength = getPasswordStrength(password)

  function validate(field: keyof Step1Data, value: string): string | undefined {
    const partial = {
      name: field === 'name' ? value : name,
      password: field === 'password' ? value : password,
      confirmPassword: field === 'confirmPassword' ? value : confirmPassword,
    }
    const result = step1Schema.safeParse(partial)
    if (result.success) return undefined
    const fieldError = result.error.errors.find((e) => e.path[0] === field)
    return fieldError?.message
  }

  function handleBlur(field: keyof Step1Data) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const value = field === 'name' ? name : field === 'password' ? password : confirmPassword
    const error = validate(field, value)
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  function handleChange(field: keyof Step1Data, value: string) {
    if (field === 'name') setName(value)
    else if (field === 'password') setPassword(value)
    else setConfirmPassword(value)

    if (touched[field]) {
      const error = validate(field, value)
      setErrors((prev) => ({ ...prev, [field]: error }))
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = step1Schema.safeParse({ name, password, confirmPassword })

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof Step1Data, string>> = {}
      for (const err of result.error.errors) {
        const key = err.path[0] as keyof Step1Data
        if (!fieldErrors[key]) fieldErrors[key] = err.message
      }
      setErrors(fieldErrors)
      setTouched({ name: true, password: true, confirmPassword: true })
      return
    }

    onNext(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="ob-email">Email</Label>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
            Tu invitación
          </Badge>
        </div>
        <Input
          id="ob-email"
          type="email"
          value={email}
          readOnly
          disabled
          className="bg-muted text-muted-foreground cursor-not-allowed"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ob-name">Nombre completo</Label>
        <Input
          id="ob-name"
          value={name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          placeholder="Como querés que te llamemos"
          className={touched.name && errors.name ? 'border-destructive focus-visible:ring-destructive/30' : ''}
        />
        {touched.name && errors.name ? (
          <p className="text-xs text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ob-password">Contraseña</Label>
        <Input
          id="ob-password"
          type="password"
          value={password}
          onChange={(e) => handleChange('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          placeholder="Mínimo 8 caracteres"
          className={touched.password && errors.password ? 'border-destructive focus-visible:ring-destructive/30' : ''}
        />
        {password.length > 0 ? (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength.score >= bar ? strength.color : 'bg-border'}`}
                />
              ))}
            </div>
            {strength.label ? (
              <p className="text-xs text-muted-foreground">{strength.label}</p>
            ) : null}
          </div>
        ) : null}
        {touched.password && errors.password ? (
          <p className="text-xs text-destructive">{errors.password}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ob-confirm">Confirmá tu contraseña</Label>
        <Input
          id="ob-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          onBlur={() => handleBlur('confirmPassword')}
          placeholder="Repetí la contraseña"
          className={touched.confirmPassword && errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/30' : ''}
        />
        {touched.confirmPassword && errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        ) : null}
      </div>

      <Button type="submit" className="mt-2 w-full">
        Continuar
      </Button>
    </form>
  )
}
