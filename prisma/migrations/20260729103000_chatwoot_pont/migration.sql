-- Le pont Atline <-> Chatwoot (29 juillet 2026).
-- Colonnes NOUVELLES et nullables : l'index unique ne peut rien casser
-- (PostgreSQL autorise autant de NULL qu'on veut sous une contrainte unique).

ALTER TABLE "UserMlmBusiness" ADD COLUMN "chatwootAccountId" INTEGER;
ALTER TABLE "UserMlmBusiness" ADD COLUMN "chatwootInboxId"   INTEGER;
CREATE UNIQUE INDEX "UserMlmBusiness_chatwootAccountId_key"
  ON "UserMlmBusiness"("chatwootAccountId");

-- Ce que Chatwoot nous dit. Le webhook écrit ici et rend la main tout de
-- suite ; un traitement séparé fera travailler Orion.
CREATE TABLE "ChatwootEvenement" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "accountId"      INTEGER NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "messageId"      INTEGER,
    "contactId"      TEXT,
    "canal"          TEXT,
    "expediteur"     TEXT,
    "contenu"        TEXT,
    "charge"         JSONB,
    "traiteAt"       TIMESTAMP(3),
    "erreur"         TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatwootEvenement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatwootEvenement_userId_createdAt_idx"  ON "ChatwootEvenement"("userId", "createdAt");
CREATE INDEX "ChatwootEvenement_traiteAt_idx"          ON "ChatwootEvenement"("traiteAt");
CREATE INDEX "ChatwootEvenement_conversationId_idx"    ON "ChatwootEvenement"("conversationId");

ALTER TABLE "ChatwootEvenement"
  ADD CONSTRAINT "ChatwootEvenement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
