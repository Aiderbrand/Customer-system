-- DropForeignKey
ALTER TABLE "role_simulation_sessions"
DROP CONSTRAINT "role_simulation_sessions_target_company_id_fkey";

-- DropIndex
DROP INDEX "role_simulation_sessions_target_company_id_ended_at_idx";

-- CreateIndex
CREATE INDEX "role_simulation_sessions_effective_role_ended_at_idx"
ON "role_simulation_sessions"("effective_role", "ended_at");

-- DropColumn
ALTER TABLE "role_simulation_sessions"
DROP COLUMN "target_company_id";

-- Rollback note:
-- Recreate target_company_id + FK + index only if the old global-company simulation model is restored.
