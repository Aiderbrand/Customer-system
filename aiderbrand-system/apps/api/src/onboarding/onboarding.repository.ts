import { Injectable } from '@nestjs/common'
import {
  OnboardingSubmissionStatus,
  type OnboardingSubmission,
  type Prisma,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { UpdateOnboardingSubmissionDto } from './dto/update-onboarding-submission.dto'

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  }

  async findSubmissionById(id: string): Promise<OnboardingSubmission | null> {
    return this.prisma.onboardingSubmission.findUnique({ where: { id } })
  }

  async findSubmissionByCompanyId(companyId: string): Promise<OnboardingSubmission | null> {
    return this.prisma.onboardingSubmission.findUnique({ where: { companyId } })
  }

  async findSubmissionByUserId(userId: string): Promise<OnboardingSubmission | null> {
    return this.prisma.onboardingSubmission.findFirst({ where: { userId } })
  }

  async updateSubmission(
    submissionId: string,
    dto: UpdateOnboardingSubmissionDto,
  ): Promise<OnboardingSubmission> {
    return this.prisma.onboardingSubmission.update({
      where: { id: submissionId },
      data: {
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.teamSize !== undefined && { teamSize: dto.teamSize }),
        ...(dto.yearsOperating !== undefined && { yearsOperating: dto.yearsOperating }),
        ...(dto.mainPainPoints !== undefined && { mainPainPoints: dto.mainPainPoints }),
        ...(dto.toolsInUse !== undefined && { toolsInUse: dto.toolsInUse }),
        ...(dto.decisionMakers !== undefined && { decisionMakers: this.toJsonValue(dto.decisionMakers) }),
        ...(dto.primaryContact !== undefined && { primaryContact: this.toJsonValue(dto.primaryContact) }),
        ...(dto.shortTermGoals !== undefined && { shortTermGoals: dto.shortTermGoals }),
        ...(dto.midTermGoals !== undefined && { midTermGoals: dto.midTermGoals }),
        ...(dto.successMetrics !== undefined && { successMetrics: dto.successMetrics }),
        ...(dto.budgetRange !== undefined && { budgetRange: dto.budgetRange }),
        ...(dto.startTimeframe !== undefined && { startTimeframe: dto.startTimeframe }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    })
  }

  async markReviewed(submissionId: string, adminId: string): Promise<OnboardingSubmission> {
    return this.prisma.onboardingSubmission.update({
      where: { id: submissionId },
      data: {
        reviewedAt: new Date(),
        reviewedById: adminId,
        status: OnboardingSubmissionStatus.reviewed,
      },
    })
  }

  async createSubmissionInTx(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string
      userId: string
      industry: string
      teamSize: string
      yearsOperating: string
      mainPainPoints: string
      toolsInUse: string[]
      decisionMakers: unknown
      primaryContact: unknown
      shortTermGoals: string
      midTermGoals: string
      successMetrics: string
      budgetRange?: string
      startTimeframe?: string
      notes?: string
    },
  ): Promise<OnboardingSubmission> {
    return tx.onboardingSubmission.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        industry: data.industry,
        teamSize: data.teamSize,
        yearsOperating: data.yearsOperating,
        mainPainPoints: data.mainPainPoints,
        toolsInUse: data.toolsInUse,
        decisionMakers: this.toJsonValue(data.decisionMakers),
        primaryContact: this.toJsonValue(data.primaryContact),
        shortTermGoals: data.shortTermGoals,
        midTermGoals: data.midTermGoals,
        successMetrics: data.successMetrics,
        ...(data.budgetRange !== undefined && { budgetRange: data.budgetRange }),
        ...(data.startTimeframe !== undefined && { startTimeframe: data.startTimeframe }),
        ...(data.notes !== undefined && { notes: data.notes }),
        status: OnboardingSubmissionStatus.submitted,
      },
    })
  }
}
