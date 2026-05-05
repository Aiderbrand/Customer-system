'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { useAuth } from '@/contexts/auth-context'
import { Step1Register } from './Step1Register'
import { Step2Form } from './Step2Form'
import { Step3Team } from './Step3Team'
import { OnboardingConfirmation } from './OnboardingConfirmation'
import type { Step1Data, Step2Data, Step3Data } from '../schemas/onboarding.schema'

interface OnboardingStepperProps {
  token: string
  email: string
  companyName: string
}

type StepId = 1 | 2 | 3

const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: 1, label: 'Tu cuenta', description: 'Registro' },
  { id: 2, label: 'Tu negocio', description: 'Formulario' },
  { id: 3, label: 'Acceso al sistema', description: 'Opcional' },
]

export function OnboardingStepper({ token, email, companyName }: OnboardingStepperProps) {
  const { completeOnboarding } = useAuth()

  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [done, setDone] = useState(false)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [teamInvitesCount, setTeamInvitesCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleFinalSubmit(step3: Step3Data) {
    if (!step1Data || !step2Data) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const { projectName: pName } = await completeOnboarding({
        token,
        name: step1Data.name,
        password: step1Data.password,
        formAnswers: {
          industry: step2Data.industry,
          teamSize: step2Data.teamSize,
          yearsOperating: step2Data.yearsOperating,
          mainPainPoints: step2Data.mainPainPoints,
          toolsInUse: step2Data.toolsInUse,
          decisionMakers: step2Data.decisionMakers,
          primaryContact: step2Data.primaryContact,
          shortTermGoals: step2Data.shortTermGoals,
          midTermGoals: step2Data.midTermGoals,
          successMetrics: step2Data.successMetrics,
          budgetRange: step2Data.budgetRange,
          startTimeframe: step2Data.startTimeframe,
          notes: step2Data.notes,
        },
        teamInvites: step3.teamInvites ?? [],
      })

      setProjectName(pName)
      setTeamInvitesCount(step3.teamInvites?.length ?? 0)
      setDone(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ocurrió un error al finalizar el onboarding.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSkip() {
    void handleFinalSubmit({ teamInvites: [] })
  }

  if (done) {
    return <OnboardingConfirmation companyName={companyName} projectName={projectName ?? undefined} teamInvitesCount={teamInvitesCount} />
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Stepper nav */}
      <nav aria-label="Progreso del onboarding">
        <ol className="flex items-start justify-between gap-2">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id
            const isActive = currentStep === step.id
            const isUpcoming = currentStep < step.id

            return (
              <li key={step.id} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center gap-1">
                  {index > 0 ? (
                    <div className={`h-px flex-1 transition-all duration-500 ${isCompleted || isActive ? 'bg-primary' : 'bg-border'}`} />
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div
                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isActive
                          ? 'border-primary bg-background text-primary shadow-sm'
                          : 'border-border bg-background text-muted-foreground/40'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>

                  {index < STEPS.length - 1 ? (
                    <div className={`h-px flex-1 transition-all duration-500 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>

                <div className="text-center">
                  <p className={`text-[11px] font-semibold leading-none transition-colors ${isActive ? 'text-foreground' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                    {step.label}
                  </p>
                  <p className={`mt-0.5 text-[10px] transition-colors ${isUpcoming ? 'text-muted-foreground/30' : 'text-muted-foreground'}`}>
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      <div>
        {submitError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        {currentStep === 1 ? (
          <Step1Register
            email={email}
            initialData={step1Data ?? undefined}
            onNext={(data) => {
              setStep1Data(data)
              setCurrentStep(2)
            }}
          />
        ) : currentStep === 2 ? (
          <Step2Form
            initialData={step2Data ?? undefined}
            onNext={(data) => {
              setStep2Data(data)
              setCurrentStep(3)
            }}
            onBack={() => setCurrentStep(1)}
          />
        ) : (
          <Step3Team
            onNext={handleFinalSubmit}
            onBack={() => setCurrentStep(2)}
            onSkip={handleSkip}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}
