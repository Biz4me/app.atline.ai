-- CreateEnum
CREATE TYPE "IntentionEtat" AS ENUM ('ARMEE', 'TOMBEE', 'TERMINEE', 'ANNULEE', 'EXPIREE');

-- CreateTable
CREATE TABLE "AtlasIntention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "libelle" TEXT NOT NULL,
    "declencheurs" TEXT[],
    "etat" "IntentionEtat" NOT NULL DEFAULT 'ARMEE',
    "tombees" INTEGER NOT NULL DEFAULT 0,
    "budget" INTEGER NOT NULL DEFAULT 3,
    "reposHeures" INTEGER NOT NULL DEFAULT 24,
    "derniereFois" TIMESTAMP(3),
    "expireLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtlasIntention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtlasIntention_userId_etat_idx" ON "AtlasIntention"("userId", "etat");

-- CreateIndex
CREATE INDEX "AtlasIntention_userId_contactId_etat_idx" ON "AtlasIntention"("userId", "contactId", "etat");

-- AddForeignKey
ALTER TABLE "AtlasIntention" ADD CONSTRAINT "AtlasIntention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasIntention" ADD CONSTRAINT "AtlasIntention_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
