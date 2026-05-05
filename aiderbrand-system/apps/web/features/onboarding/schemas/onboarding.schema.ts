import { z } from 'zod'
import { ROLES } from '@/lib/constants/roles'

// ─── Step 1 — Registro personal ──────────────────────────────────────────────

const step1BaseSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmá tu contraseña'),
})

export const step1Schema = step1BaseSchema.refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] },
)

export type Step1Data = z.infer<typeof step1Schema>

// ─── Step 2 — Formulario del negocio ─────────────────────────────────────────

export const decisionMakerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  role: z.string().min(1, 'El rol es requerido'),
  email: z.string().email('Email inválido'),
})

export const primaryContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  role: z.string().min(1, 'El rol es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
})

export const step2Schema = z.object({
  // Bloque 1 — Tu negocio
  industry: z.string().min(1, 'Seleccioná una industria'),
  teamSize: z.string().min(1, 'Seleccioná el tamaño del equipo'),
  yearsOperating: z.string().min(1, 'Seleccioná los años de operación'),

  // Bloque 2 — Cómo trabajás hoy
  mainPainPoints: z.string().min(10, 'Contanos un poco más (mínimo 10 caracteres)'),
  toolsInUse: z.array(z.string()).min(1, 'Seleccioná al menos una herramienta'),

  // Bloque 3 — Tu equipo
  primaryContact: primaryContactSchema,
  decisionMakers: z.array(decisionMakerSchema).default([]),

  // Bloque 4 — Objetivos
  shortTermGoals: z.string().min(10, 'Contanos qué querés mejorar (mínimo 10 caracteres)'),
  midTermGoals: z.string().min(10, 'Contanos tus objetivos a 3 meses (mínimo 10 caracteres)'),
  successMetrics: z.string().min(10, 'Contanos cómo medirías el éxito (mínimo 10 caracteres)'),
  budgetRange: z.string().optional(),
  startTimeframe: z.string().optional(),
  notes: z.string().optional(),
})

export type Step2Data = z.infer<typeof step2Schema>
export type DecisionMaker = z.infer<typeof decisionMakerSchema>

// ─── Step 3 — Equipo ──────────────────────────────────────────────────────────

export const teamInviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum([ROLES.COLLABORATOR, ROLES.ACCOUNT_OWNER]),
})

export const step3Schema = z.object({
  teamInvites: z.array(teamInviteSchema).optional().default([]),
})

export type Step3Data = z.infer<typeof step3Schema>
export type TeamInvite = z.infer<typeof teamInviteSchema>

// ─── Combined schema ──────────────────────────────────────────────────────────

export const completeOnboardingSchema = step1BaseSchema.omit({ confirmPassword: true }).merge(step2Schema).merge(step3Schema)

export type CompleteOnboardingFormData = z.infer<typeof completeOnboardingSchema>
