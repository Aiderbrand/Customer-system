-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('MEMBER', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('invited', 'in_progress', 'completed');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "onboardingStatus" "OnboardingStatus";

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "type" "InvitationType" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "onboarding_submissions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "yearsOperating" TEXT NOT NULL,
    "mainPainPoints" TEXT NOT NULL,
    "toolsInUse" JSONB NOT NULL,
    "decisionMakers" JSONB NOT NULL,
    "primaryContact" JSONB NOT NULL,
    "shortTermGoals" TEXT NOT NULL,
    "midTermGoals" TEXT NOT NULL,
    "successMetrics" TEXT NOT NULL,
    "budgetRange" TEXT,
    "startTimeframe" TEXT NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_submissions_companyId_key" ON "onboarding_submissions"("companyId");

-- AddForeignKey
ALTER TABLE "onboarding_submissions" ADD CONSTRAINT "onboarding_submissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
