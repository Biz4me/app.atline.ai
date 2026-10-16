-- DropIndex
DROP INDEX "MlmCompany_franceOperee_idx";

-- CreateTable
CREATE TABLE "ConsommationVocale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "conversationId" TEXT,
    "dureeSecondes" DOUBLE PRECISION,
    "consommation" JSONB,
    "raisonFin" TEXT,
    "sttSecondesFacturees" DOUBLE PRECISION,
    "factureAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsommationVocale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsommationVocale_room_key" ON "ConsommationVocale"("room");

-- CreateIndex
CREATE INDEX "ConsommationVocale_userId_createdAt_idx" ON "ConsommationVocale"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsommationVocale_agent_createdAt_idx" ON "ConsommationVocale"("agent", "createdAt");

-- CreateIndex
CREATE INDEX "ConsommationVocale_factureAt_idx" ON "ConsommationVocale"("factureAt");

-- AddForeignKey
ALTER TABLE "ConsommationVocale" ADD CONSTRAINT "ConsommationVocale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsommationVocale" ADD CONSTRAINT "ConsommationVocale_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AtlasConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
