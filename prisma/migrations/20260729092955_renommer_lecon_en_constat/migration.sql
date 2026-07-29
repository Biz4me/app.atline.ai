/*
  Warnings:

  - You are about to drop the `MlmLecon` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MlmLecon" DROP CONSTRAINT "MlmLecon_companyId_fkey";

-- DropTable
DROP TABLE "MlmLecon";

-- CreateTable
CREATE TABLE "MlmConstat" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agent" "AgentName" NOT NULL,
    "sujet" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "actions" INTEGER NOT NULL,
    "reussites" INTEGER NOT NULL,
    "taux" DOUBLE PRECISION NOT NULL,
    "tauxReference" DOUBLE PRECISION NOT NULL,
    "distributeurs" INTEGER NOT NULL,
    "enonce" TEXT NOT NULL,
    "calculeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlmConstat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MlmConstat_companyId_agent_idx" ON "MlmConstat"("companyId", "agent");

-- CreateIndex
CREATE UNIQUE INDEX "MlmConstat_companyId_agent_sujet_valeur_key" ON "MlmConstat"("companyId", "agent", "sujet", "valeur");

-- AddForeignKey
ALTER TABLE "MlmConstat" ADD CONSTRAINT "MlmConstat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "MlmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
