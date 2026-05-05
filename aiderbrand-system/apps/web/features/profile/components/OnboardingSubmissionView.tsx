'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import type { OnboardingSubmission, OnboardingFormAnswers } from '@/lib/api/auth'
import { useOnboardingSubmission } from '../hooks/useOnboardingSubmission'
import {
  INDUSTRY_OPTIONS,
  INDUSTRY_LABELS,
  TEAM_SIZE_OPTIONS,
  TEAM_SIZE_LABELS,
  YEARS_OPTIONS,
  YEARS_LABELS,
  BUDGET_OPTIONS,
  BUDGET_LABELS,
  TIMEFRAME_OPTIONS,
  TIMEFRAME_LABELS,
  TOOLS_OPTIONS,
} from '@/features/onboarding/constants/onboarding-options'

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#1a1a2e]/40">{label}</p>
      <p className="text-sm text-[#1a1a2e]">{value || <span className="text-[#1a1a2e]/30 italic">No especificado</span>}</p>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-[#e5e0d8] pb-3">
      <p className="text-sm font-semibold text-[#1a1a2e]">{title}</p>
      {subtitle ? <p className="mt-0.5 text-xs text-[#1a1a2e]/50">{subtitle}</p> : null}
    </div>
  )
}

export function OnboardingSubmissionView() {
  const { submission, loading, loadError, saving, saveError, savedAt, save } = useOnboardingSubmission()
  const [editForm, setEditForm] = useState<Partial<OnboardingFormAnswers>>({})

  useEffect(() => {
    if (submission) {
      setEditForm(submissionToFormAnswers(submission))
    }
  }, [submission])

  const isReviewed = submission?.reviewedAt != null
  const isEditable = !isReviewed

  function submissionToFormAnswers(s: OnboardingSubmission): Partial<OnboardingFormAnswers> {
    return {
      industry: s.industry ?? '',
      teamSize: s.teamSize ?? '',
      yearsOperating: s.yearsOperating ?? '',
      mainPainPoints: s.mainPainPoints ?? '',
      toolsInUse: s.toolsInUse ?? [],
      primaryContact: s.primaryContact ?? { name: '', role: '', email: '' },
      decisionMakers: s.decisionMakers ?? [],
      shortTermGoals: s.shortTermGoals ?? '',
      midTermGoals: s.midTermGoals ?? '',
      successMetrics: s.successMetrics ?? '',
      budgetRange: s.budgetRange ?? '',
      startTimeframe: s.startTimeframe ?? '',
      notes: s.notes ?? '',
    }
  }

  function setField<K extends keyof OnboardingFormAnswers>(key: K, value: OnboardingFormAnswers[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleTool(tool: string) {
    const current = (editForm.toolsInUse ?? [])
    const next = current.includes(tool)
      ? current.filter((t) => t !== tool)
      : [...current, tool]
    setField('toolsInUse', next)
  }

  async function handleSave() {
    await save(editForm)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-[#e5e0d8] bg-[#faf8f5] px-4 py-6 text-center">
        <p className="text-sm text-[#1a1a2e]/60">{loadError}</p>
      </div>
    )
  }

  if (!submission) return null

  // ── Read-only mode ────────────────────────────────────────────────────────

  if (isReviewed) {
    return (
      <div className="flex flex-col gap-8">
        {/* Reviewed badge */}
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-emerald-600">✓</span>
          <div>
            <p className="text-sm font-medium text-emerald-800">Revisado por AIDERBRAND</p>
            <p className="text-xs text-emerald-600">
              El equipo revisó este formulario el {formatDate(submission.reviewedAt!)}
            </p>
          </div>
          <Badge className="ml-auto rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Revisado
          </Badge>
        </div>

        {/* Block 1 */}
        <section className="flex flex-col gap-5">
          <SectionTitle title="Tu negocio" />
          <div className="grid grid-cols-3 gap-4">
            <ReadOnlyField label="Industria" value={INDUSTRY_LABELS[submission.industry ?? ''] ?? submission.industry} />
            <ReadOnlyField label="Equipo" value={TEAM_SIZE_LABELS[submission.teamSize ?? ''] ?? submission.teamSize} />
            <ReadOnlyField label="Años operando" value={YEARS_LABELS[submission.yearsOperating ?? ''] ?? submission.yearsOperating} />
          </div>
        </section>

        {/* Block 2 */}
        <section className="flex flex-col gap-5">
          <SectionTitle title="Cómo trabajás hoy" />
          <ReadOnlyField label="Problema principal" value={submission.mainPainPoints} />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1a1a2e]/40">Herramientas</p>
            <div className="flex flex-wrap gap-1.5">
              {(submission.toolsInUse ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="rounded-full text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Block 3 */}
        <section className="flex flex-col gap-5">
          <SectionTitle title="Tu equipo" />
          {submission.primaryContact ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#1a1a2e]/40">Contacto principal</p>
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="Nombre" value={submission.primaryContact.name} />
                <ReadOnlyField label="Rol" value={submission.primaryContact.role} />
                <ReadOnlyField label="Email" value={submission.primaryContact.email} />
                {submission.primaryContact.phone ? (
                  <ReadOnlyField label="Teléfono" value={submission.primaryContact.phone} />
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {/* Block 4 */}
        <section className="flex flex-col gap-5">
          <SectionTitle title="Objetivos" />
          <ReadOnlyField label="30 días" value={submission.shortTermGoals} />
          <ReadOnlyField label="3 meses" value={submission.midTermGoals} />
          <ReadOnlyField label="Cómo medís el éxito" value={submission.successMetrics} />
          {submission.budgetRange ? (
            <ReadOnlyField label="Presupuesto" value={BUDGET_LABELS[submission.budgetRange] ?? submission.budgetRange} />
          ) : null}
          <ReadOnlyField label="Cuándo empezar" value={TIMEFRAME_LABELS[submission.startTimeframe ?? ''] ?? submission.startTimeframe} />
          {submission.notes ? <ReadOnlyField label="Notas" value={submission.notes} /> : null}
        </section>
      </div>
    )
  }

  // ── Editable mode ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {savedAt ? (
        <div className="rounded-lg border border-[#e5e0d8] bg-[#faf8f5] px-4 py-2.5">
          <p className="text-xs text-[#1a1a2e]/60">
            Cambios guardados el {formatDate(savedAt)} ✓
          </p>
        </div>
      ) : null}

      {/* Block 1 */}
      <section className="flex flex-col gap-5">
        <SectionTitle title="Tu negocio" />
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Industria</Label>
            <Select value={editForm.industry ?? ''} onValueChange={(v) => setField('industry', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {INDUSTRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Equipo</Label>
            <Select value={editForm.teamSize ?? ''} onValueChange={(v) => setField('teamSize', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TEAM_SIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Años operando</Label>
            <Select value={editForm.yearsOperating ?? ''} onValueChange={(v) => setField('yearsOperating', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {YEARS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Block 2 */}
      <section className="flex flex-col gap-5">
        <SectionTitle title="Cómo trabajás hoy" />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-[#1a1a2e]/60">Problema principal</Label>
          <Textarea
            value={editForm.mainPainPoints ?? ''}
            onChange={(e) => setField('mainPainPoints', e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-[#1a1a2e]/60">Herramientas</Label>
          <div className="flex flex-wrap gap-2">
            {TOOLS_OPTIONS.map((tool) => {
              const selected = (editForm.toolsInUse ?? []).includes(tool)
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    selected
                      ? 'border-[#1a1a2e] bg-[#1a1a2e] text-[#f0ebe1]'
                      : 'border-[#e5e0d8] bg-white text-[#1a1a2e]/60 hover:border-[#1a1a2e]/40'
                  }`}
                >
                  {tool}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Block 3 */}
      <section className="flex flex-col gap-5">
        <SectionTitle title="Tu equipo — Contacto principal" />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Nombre</Label>
            <Input
              value={editForm.primaryContact?.name ?? ''}
              onChange={(e) => setField('primaryContact', { ...editForm.primaryContact!, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Rol</Label>
            <Input
              value={editForm.primaryContact?.role ?? ''}
              onChange={(e) => setField('primaryContact', { ...editForm.primaryContact!, role: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Email</Label>
            <Input
              type="email"
              value={editForm.primaryContact?.email ?? ''}
              onChange={(e) => setField('primaryContact', { ...editForm.primaryContact!, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Teléfono (opcional)</Label>
            <Input
              type="tel"
              value={editForm.primaryContact?.phone ?? ''}
              onChange={(e) => setField('primaryContact', { ...editForm.primaryContact!, phone: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* Block 4 */}
      <section className="flex flex-col gap-5">
        <SectionTitle title="Objetivos" />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-[#1a1a2e]/60">¿Qué querés mejorar en 30 días?</Label>
          <Textarea value={editForm.shortTermGoals ?? ''} onChange={(e) => setField('shortTermGoals', e.target.value)} rows={2} className="resize-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-[#1a1a2e]/60">¿Y en 3 meses?</Label>
          <Textarea value={editForm.midTermGoals ?? ''} onChange={(e) => setField('midTermGoals', e.target.value)} rows={2} className="resize-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-[#1a1a2e]/60">¿Cómo medirías el éxito?</Label>
          <Textarea value={editForm.successMetrics ?? ''} onChange={(e) => setField('successMetrics', e.target.value)} rows={2} className="resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">Presupuesto (opcional)</Label>
            <Select value={editForm.budgetRange ?? ''} onValueChange={(v) => setField('budgetRange', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccioná" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {BUDGET_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#1a1a2e]/60">¿Cuándo empezar?</Label>
            <Select value={editForm.startTimeframe ?? ''} onValueChange={(v) => setField('startTimeframe', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TIMEFRAME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-[#1a1a2e]/60">Notas adicionales (opcional)</Label>
          <Textarea value={editForm.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} rows={2} className="resize-none" />
        </div>
      </section>

      {/* Save button */}
      {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#1a1a2e] py-5 text-sm font-semibold tracking-wide text-[#f0ebe1] hover:bg-[#1a1a2e]/85"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
