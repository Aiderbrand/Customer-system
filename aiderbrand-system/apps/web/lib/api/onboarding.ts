import { apiClient } from './client'
import type {
  OnboardingFormAnswers,
  OnboardingSubmission,
  DecisionMaker,
  PrimaryContact,
} from '@/lib/api/auth'

function toOnboardingSubmission(payload: Record<string, unknown>): OnboardingSubmission {
  return {
    id: String(payload.id),
    companyId: String(payload.companyId),
    industry: payload.industry != null ? String(payload.industry) : null,
    teamSize: payload.teamSize != null ? String(payload.teamSize) : null,
    yearsOperating: payload.yearsOperating != null ? String(payload.yearsOperating) : null,
    mainPainPoints: payload.mainPainPoints != null ? String(payload.mainPainPoints) : null,
    toolsInUse: Array.isArray(payload.toolsInUse) ? (payload.toolsInUse as string[]) : [],
    decisionMakers: Array.isArray(payload.decisionMakers) ? (payload.decisionMakers as DecisionMaker[]) : [],
    primaryContact: payload.primaryContact != null ? (payload.primaryContact as PrimaryContact) : null,
    shortTermGoals: payload.shortTermGoals != null ? String(payload.shortTermGoals) : null,
    midTermGoals: payload.midTermGoals != null ? String(payload.midTermGoals) : null,
    successMetrics: payload.successMetrics != null ? String(payload.successMetrics) : null,
    budgetRange: payload.budgetRange != null ? String(payload.budgetRange) : null,
    startTimeframe: payload.startTimeframe != null ? String(payload.startTimeframe) : null,
    notes: payload.notes != null ? String(payload.notes) : null,
    reviewedAt: payload.reviewedAt != null ? new Date(String(payload.reviewedAt)) : null,
    reviewedById: payload.reviewedById != null ? String(payload.reviewedById) : null,
    createdAt: new Date(String(payload.createdAt)),
    updatedAt: new Date(String(payload.updatedAt)),
  }
}

export const onboardingApi = {
  async getSubmission(): Promise<OnboardingSubmission> {
    const payload = await apiClient.request<Record<string, unknown>>('/onboarding/me/submission', {
      method: 'GET',
    })
    return toOnboardingSubmission(payload)
  },

  async updateSubmission(data: Partial<OnboardingFormAnswers>): Promise<OnboardingSubmission> {
    const payload = await apiClient.request<Record<string, unknown>>('/onboarding/me/submission', {
      method: 'PATCH',
      body: data as unknown as Record<string, unknown>,
    })
    return toOnboardingSubmission(payload)
  },
}
