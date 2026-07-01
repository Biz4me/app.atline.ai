-- Journal des interactions CRM (fondation des actions) — nourrit exposures + lastContact + historique
CREATE TYPE "InteractionType" AS ENUM ('APPEL','SMS','EMAIL','WHATSAPP','DM','VOCAL','RDV','RELANCE','PARTAGE','NOTE','AUTRE');

CREATE TABLE "Interaction" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "InteractionType" NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'OUT',
  "outcome" TEXT,
  "body" TEXT,
  "isExposure" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Interaction_contactId_idx" ON "Interaction"("contactId");

ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
