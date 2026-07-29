-- CreateEnum
CREATE TYPE "AgentName" AS ENUM ('ATLAS', 'NOVA', 'ORION', 'IRIS', 'ECHO');

-- CreateEnum
CREATE TYPE "AgentActionType" AS ENUM ('MESSAGE', 'RELANCE', 'PUBLICATION', 'INVITATION', 'APPEL', 'RDV', 'ETAPE', 'LECON');

-- CreateEnum
CREATE TYPE "AgentOutcome" AS ENUM ('EN_ATTENTE', 'REPONDU', 'CLIQUE', 'ACHETE', 'RDV_PRIS', 'AVANCE', 'IGNORE', 'NEGATIF');

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" "AgentName" NOT NULL,
    "type" "AgentActionType" NOT NULL,
    "contactId" TEXT,
    "canal" TEXT,
    "sourceId" TEXT,
    "contenu" TEXT,
    "contexte" JSONB,
    "outcome" "AgentOutcome" NOT NULL DEFAULT 'EN_ATTENTE',
    "outcomeAt" TIMESTAMP(3),
    "delaiMinutes" INTEGER,
    "valeur" DOUBLE PRECISION,
    "mesureAt" TIMESTAMP(3),
    "echeance" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentAction_userId_agent_createdAt_idx" ON "AgentAction"("userId", "agent", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAction_outcome_echeance_idx" ON "AgentAction"("outcome", "echeance");

-- CreateIndex
CREATE INDEX "AgentAction_contactId_idx" ON "AgentAction"("contactId");

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
