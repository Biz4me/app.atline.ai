-- CreateTable
CREATE TABLE "MlmLecon" (
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

    CONSTRAINT "MlmLecon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MlmLecon_companyId_agent_idx" ON "MlmLecon"("companyId", "agent");

-- CreateIndex
CREATE UNIQUE INDEX "MlmLecon_companyId_agent_sujet_valeur_key" ON "MlmLecon"("companyId", "agent", "sujet", "valeur");

-- AddForeignKey
ALTER TABLE "MlmLecon" ADD CONSTRAINT "MlmLecon_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "MlmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
