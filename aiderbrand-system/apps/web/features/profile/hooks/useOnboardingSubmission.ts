'use client'

import { useCallback, useEffect, useState } from 'react'
import type { OnboardingFormAnswers, OnboardingSubmission } from '@/lib/api/auth'
import { onboardingApi } from '@/lib/api/onboarding'

interface UseOnboardingSubmissionReturn {
  submission: OnboardingSubmission | null
  loading: boolean
  loadError: string | null
  saving: boolean
  saveError: string | null
  savedAt: Date | null
  save: (data: Partial<OnboardingFormAnswers>) => Promise<void>
}

export function useOnboardingSubmission(): UseOnboardingSubmissionReturn {
  const [submission, setSubmission] = useState<OnboardingSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    void onboardingApi
      .getSubmission()
      .then((data) => {
        setSubmission(data)
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el formulario.')
      })
      .finally(() => setLoading(false))
  }, [])

  const save = useCallback(async (data: Partial<OnboardingFormAnswers>) => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await onboardingApi.updateSubmission(data)
      setSubmission(updated)
      setSavedAt(new Date())
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }, [])

  return { submission, loading, loadError, saving, saveError, savedAt, save }
}
