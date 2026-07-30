-- La séquence de relance e-mail s'appuie sur la table Relance existante
-- plutôt que d'en créer une seconde : le distributeur ne doit pas avoir deux
-- listes de choses à faire, et tout ce qui affiche déjà ses relances (plan du
-- jour, accueil, message du matin) hérite de la séquence sans une ligne de plus.

ALTER TABLE "Relance" ADD COLUMN "etape" INTEGER;
ALTER TABLE "Relance" ADD COLUMN "emailFilId" TEXT;
ALTER TABLE "Relance" ADD COLUMN "raisonFin" TEXT;

CREATE INDEX "Relance_userId_status_dueAt_idx" ON "Relance"("userId", "status", "dueAt");
CREATE INDEX "Relance_emailFilId_idx" ON "Relance"("emailFilId");
