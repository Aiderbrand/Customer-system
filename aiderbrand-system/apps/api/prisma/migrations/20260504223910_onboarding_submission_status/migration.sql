-- CreateEnum
CREATE TYPE "OnboardingSubmissionStatus" AS ENUM ('draft', 'submitted', 'reviewed');

-- AlterTable
ALTER TABLE "onboarding_submissions" ADD COLUMN "status" "OnboardingSubmissionStatus" NOT NULL DEFAULT 'draft';
