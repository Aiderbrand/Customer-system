-- CreateTable
CREATE TABLE "role_simulation_sessions" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "target_company_id" TEXT NOT NULL,
    "effective_role" "Role" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),
    "stopped_by_user_id" TEXT,

    CONSTRAINT "role_simulation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_simulation_sessions_actor_user_id_ended_at_idx" ON "role_simulation_sessions"("actor_user_id", "ended_at");

-- CreateIndex
CREATE INDEX "role_simulation_sessions_target_company_id_ended_at_idx" ON "role_simulation_sessions"("target_company_id", "ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_simulation_sessions_actor_user_id_active_key"
ON "role_simulation_sessions"("actor_user_id")
WHERE "ended_at" IS NULL;

-- AddForeignKey
ALTER TABLE "role_simulation_sessions"
ADD CONSTRAINT "role_simulation_sessions_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_simulation_sessions"
ADD CONSTRAINT "role_simulation_sessions_target_company_id_fkey"
FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_simulation_sessions"
ADD CONSTRAINT "role_simulation_sessions_stopped_by_user_id_fkey"
FOREIGN KEY ("stopped_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
