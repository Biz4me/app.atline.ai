-- Le fil e-mail et son expéditeur figé (canal e-mail, phase 3).

CREATE TYPE "EmailIssue" AS ENUM ('RDV', 'INSCRIPTION', 'ACHAT', 'REFUS', 'HANDOFF');

CREATE TABLE "EmailFil" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    -- Figée à la création : un fil appartient à la boîte qui l'a ouvert.
    "adresseEnvoi" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "dernierMessageId" TEXT,
    "echanges" INTEGER NOT NULL DEFAULT 0,
    "issue" "EmailIssue",
    "humainRepris" BOOLEAN NOT NULL DEFAULT false,
    "dernierEnvoiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailFil_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailFil_userId_updatedAt_idx" ON "EmailFil"("userId", "updatedAt");
CREATE INDEX "EmailFil_gmailThreadId_idx" ON "EmailFil"("gmailThreadId");
CREATE INDEX "EmailFil_userId_destinataire_idx" ON "EmailFil"("userId", "destinataire");
