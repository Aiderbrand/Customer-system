'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import { Separator } from '@workspace/ui/components/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { step2Schema, type Step2Data, type DecisionMaker } from '../schemas/onboarding.schema'
import {
  INDUSTRY_OPTIONS,
  TEAM_SIZE_OPTIONS,
  YEARS_OPTIONS,
  TOOLS_OPTIONS,
} from '../constants/onboarding-options'

interface Step2FormProps {
  initialData?: Partial<Step2Data>
  onNext: (data: Step2Data) => void
  onBack: () => void
}


function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {number}
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function Step2Form({ initialData, onNext, onBack }: Step2FormProps) {
  const [form, setForm] = useState<Partial<Step2Data>>({
    industry: initialData?.industry ?? '',
    teamSize: initialData?.teamSize ?? '',
    yearsOperating: initialData?.yearsOperating ?? '',
    mainPainPoints: initialData?.mainPainPoints ?? '',
    toolsInUse: initialData?.toolsInUse ?? [],
    primaryContact: initialData?.primaryContact ?? { name: '', role: '', email: '', phone: '' },
    decisionMakers: initialData?.decisionMakers ?? [],
    shortTermGoals: initialData?.shortTermGoals ?? '',
    midTermGoals: initialData?.midTermGoals ?? '',
    successMetrics: initialData?.successMetrics ?? '',
    notes: initialData?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newDm, setNewDm] = useState<DecisionMaker>({ name: '', role: '', email: '' })
  const [dmError, setDmError] = useState<string | null>(null)

  function setField<K extends keyof Step2Data>(key: K, value: Step2Data[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
    }
  }

  function toggleTool(tool: string) {
    const current = (form.toolsInUse ?? []) as string[]
    const next = current.includes(tool)
      ? current.filter((t) => t !== tool)
      : [...current, tool]
    setField('toolsInUse', next)
  }

  function addDecisionMaker() {
    if (!newDm.name || !newDm.role || !newDm.email) {
      setDmError('Completá nombre, rol y email antes de agregar.')
      return
    }
    const emailSchema = z.string().email()
    if (!emailSchema.safeParse(newDm.email).success) {
      setDmError('El email no es válido.')
      return
    }
    setField('decisionMakers', [...(form.decisionMakers ?? []), newDm])
    setNewDm({ name: '', role: '', email: '' })
    setDmError(null)
  }

  function removeDecisionMaker(index: number) {
    setField(
      'decisionMakers',
      (form.decisionMakers ?? []).filter((_, i) => i !== index),
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = step2Schema.safeParse(form)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const err of result.error.errors) {
        const path = err.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = err.message
      }
      setErrors(fieldErrors)
      const firstErrorEl = document.querySelector('[data-error="true"]')
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    onNext(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">

      {/* ── Bloque 1: Tu negocio ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <SectionTitle number="1" title="Tu negocio" subtitle="Contanos de qué trata lo que hacés" />
        <Separator />

        <div className="flex flex-col gap-2" data-error={!!errors.industry}>
          <Label>Industria</Label>
          <Select value={form.industry ?? ''} onValueChange={(v) => setField('industry', v)}>
            <SelectTrigger className={errors.industry ? 'border-destructive' : ''}>
              <SelectValue placeholder="Seleccioná tu industria" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError message={errors.industry} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2" data-error={!!errors.teamSize}>
            <Label>Tamaño del equipo</Label>
            <Select value={form.teamSize ?? ''} onValueChange={(v) => setField('teamSize', v)}>
              <SelectTrigger className={errors.teamSize ? 'border-destructive' : ''}>
                <SelectValue placeholder="Tamaño" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TEAM_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError message={errors.teamSize} />
          </div>

          <div className="flex flex-col gap-2" data-error={!!errors.yearsOperating}>
            <Label>Años operando</Label>
            <Select value={form.yearsOperating ?? ''} onValueChange={(v) => setField('yearsOperating', v)}>
              <SelectTrigger className={errors.yearsOperating ? 'border-destructive' : ''}>
                <SelectValue placeholder="Antigüedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {YEARS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError message={errors.yearsOperating} />
          </div>
        </div>
      </section>

      {/* ── Bloque 2: Cómo trabajás hoy ──────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <SectionTitle number="2" title="Cómo trabajás hoy" subtitle="Entender tu operación actual nos ayuda a mejorarla" />
        <Separator />

        <div className="flex flex-col gap-2" data-error={!!errors.mainPainPoints}>
          <Label>¿Cuál es el principal problema que querés resolver?</Label>
          <Textarea
            value={form.mainPainPoints ?? ''}
            onChange={(e) => setField('mainPainPoints', e.target.value)}
            placeholder="Contanos con tus palabras qué te traba hoy..."
            rows={3}
            className={`resize-none ${errors.mainPainPoints ? 'border-destructive' : ''}`}
          />
          <FieldError message={errors.mainPainPoints} />
        </div>

        <div className="flex flex-col gap-2" data-error={!!errors.toolsInUse}>
          <Label>¿Qué herramientas usás actualmente?</Label>
          <div className="flex flex-wrap gap-2">
            {TOOLS_OPTIONS.map((tool) => {
              const selected = (form.toolsInUse ?? []).includes(tool)
              return (
                <Button
                  key={tool}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTool(tool)}
                  className="rounded-full text-xs"
                >
                  {tool}
                </Button>
              )
            })}
          </div>
          <FieldError message={errors.toolsInUse} />
        </div>
      </section>

      {/* ── Bloque 3: Tu equipo ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <SectionTitle number="3" title="Tu equipo" subtitle="¿Quiénes son las personas clave de tu organización?" />
        <Separator />

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Contacto principal
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5" data-error={!!errors['primaryContact.name']}>
              <Label className="text-xs">Nombre</Label>
              <Input
                value={form.primaryContact?.name ?? ''}
                onChange={(e) => setField('primaryContact', { ...form.primaryContact!, name: e.target.value })}
                placeholder="Nombre completo"
                className={errors['primaryContact.name'] ? 'border-destructive' : ''}
              />
              <FieldError message={errors['primaryContact.name']} />
            </div>
            <div className="flex flex-col gap-1.5" data-error={!!errors['primaryContact.role']}>
              <Label className="text-xs">Rol / Cargo</Label>
              <Input
                value={form.primaryContact?.role ?? ''}
                onChange={(e) => setField('primaryContact', { ...form.primaryContact!, role: e.target.value })}
                placeholder="CEO, Gerente..."
                className={errors['primaryContact.role'] ? 'border-destructive' : ''}
              />
              <FieldError message={errors['primaryContact.role']} />
            </div>
            <div className="flex flex-col gap-1.5" data-error={!!errors['primaryContact.email']}>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.primaryContact?.email ?? ''}
                onChange={(e) => setField('primaryContact', { ...form.primaryContact!, email: e.target.value })}
                placeholder="email@empresa.com"
                className={errors['primaryContact.email'] ? 'border-destructive' : ''}
              />
              <FieldError message={errors['primaryContact.email']} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Teléfono (opcional)</Label>
              <Input
                type="tel"
                value={form.primaryContact?.phone ?? ''}
                onChange={(e) => setField('primaryContact', { ...form.primaryContact!, phone: e.target.value })}
                placeholder="+54 11..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tomadores de decisión
          </p>

          {(form.decisionMakers ?? []).length > 0 ? (
            <div className="flex flex-col gap-2">
              {(form.decisionMakers ?? []).map((dm, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{dm.name}</p>
                    <p className="text-xs text-muted-foreground">{dm.role} · {dm.email}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDecisionMaker(i)} className="text-xs text-destructive hover:text-destructive">
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={newDm.name}
                onChange={(e) => setNewDm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nombre"
                className="text-sm"
              />
              <Input
                value={newDm.role}
                onChange={(e) => setNewDm((p) => ({ ...p, role: e.target.value }))}
                placeholder="Rol"
                className="text-sm"
              />
              <Input
                type="email"
                value={newDm.email}
                onChange={(e) => setNewDm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                className="text-sm"
              />
            </div>
            {dmError ? <p className="text-xs text-destructive">{dmError}</p> : null}
            <Button type="button" variant="outline" size="sm" onClick={addDecisionMaker} className="self-start text-xs">
              + Agregar persona
            </Button>
          </div>
        </div>
      </section>

      {/* ── Bloque 4: Objetivos ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <SectionTitle number="4" title="Objetivos" subtitle="Esto nos ayuda a medir el impacto de nuestro trabajo" />
        <Separator />

        <div className="flex flex-col gap-2" data-error={!!errors.shortTermGoals}>
          <Label>¿Qué querés mejorar en los próximos 30 días?</Label>
          <Textarea
            value={form.shortTermGoals ?? ''}
            onChange={(e) => setField('shortTermGoals', e.target.value)}
            rows={2}
            placeholder="Pensá en algo concreto y alcanzable..."
            className={`resize-none ${errors.shortTermGoals ? 'border-destructive' : ''}`}
          />
          <FieldError message={errors.shortTermGoals} />
        </div>

        <div className="flex flex-col gap-2" data-error={!!errors.midTermGoals}>
          <Label>¿Y en los próximos 3 meses?</Label>
          <Textarea
            value={form.midTermGoals ?? ''}
            onChange={(e) => setField('midTermGoals', e.target.value)}
            rows={2}
            placeholder="¿Dónde querés estar parado en 90 días?"
            className={`resize-none ${errors.midTermGoals ? 'border-destructive' : ''}`}
          />
          <FieldError message={errors.midTermGoals} />
        </div>

        <div className="flex flex-col gap-2" data-error={!!errors.successMetrics}>
          <Label>¿Cómo sabrías que el acompañamiento funcionó?</Label>
          <Textarea
            value={form.successMetrics ?? ''}
            onChange={(e) => setField('successMetrics', e.target.value)}
            rows={2}
            placeholder="Métricas, sensaciones, resultados esperados..."
            className={`resize-none ${errors.successMetrics ? 'border-destructive' : ''}`}
          />
          <FieldError message={errors.successMetrics} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>¿Algo importante que AIDERBRAND debería saber? (opcional)</Label>
          <Textarea
            value={form.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
            rows={2}
            placeholder="Contexto, restricciones, historia de la empresa..."
            className="resize-none"
          />
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Atrás
        </Button>
        <Button type="submit" className="flex-[2]">
          Continuar
        </Button>
      </div>
    </form>
  )
}
