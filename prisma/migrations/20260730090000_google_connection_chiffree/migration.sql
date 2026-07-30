-- Socle de sécurité du canal e-mail (phase 1).
--
-- Écrite À LA MAIN volontairement : `prisma migrate dev` voit un renommage de
-- table comme un DROP suivi d'un CREATE, ce qui détruirait les connexions
-- Google existantes. Ici elles sont à zéro (vérifié en production le
-- 30/07/2026), mais la migration doit rester juste le jour où elles ne le
-- seront plus.

-- 1. CalendarConnection devient GoogleConnection : un distributeur n'a pas un
--    compte agenda et un compte Gmail, il a UN compte Google dont les
--    permissions s'accumulent.
ALTER TABLE "CalendarConnection" RENAME TO "GoogleConnection";
ALTER INDEX "CalendarConnection_pkey" RENAME TO "GoogleConnection_pkey";
ALTER INDEX "CalendarConnection_userId_key" RENAME TO "GoogleConnection_userId_key";

-- 2. Une connexion révoquée se distingue d'une connexion absente : on veut
--    savoir qu'un accès a existé puis a été retiré, pas juste qu'il n'y en a pas.
ALTER TABLE "GoogleConnection" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- 3. Le journal des accès — la trace que réclame l'audit CASA, et la réponse à
--    la question « qu'est-ce qui est parti en mon nom ? ». Jamais de contenu de
--    message ici : un journal qui recopie ce qu'il surveille devient la fuite
--    qu'il documente.
CREATE TYPE "GoogleAccesAction" AS ENUM ('CONNEXION', 'REVOCATION', 'ENVOI', 'LECTURE', 'SURVEILLANCE', 'ERREUR');

CREATE TABLE "GoogleAcces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "GoogleAccesAction" NOT NULL,
    "adresse" TEXT,
    "ressource" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAcces_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoogleAcces_userId_createdAt_idx" ON "GoogleAcces"("userId", "createdAt");
CREATE INDEX "GoogleAcces_action_createdAt_idx" ON "GoogleAcces"("action", "createdAt");
