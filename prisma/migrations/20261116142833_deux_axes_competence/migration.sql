-- AlterTable
ALTER TABLE "AtlasFact" ADD COLUMN     "transversaleId" TEXT;

-- AddForeignKey
ALTER TABLE "AtlasFact" ADD CONSTRAINT "AtlasFact_transversaleId_fkey" FOREIGN KEY ("transversaleId") REFERENCES "Competence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── DÉPLACER CE QUI EST DÉJÀ RANGÉ DU MAUVAIS CÔTÉ ─────────────────────────
--
-- 73 faits portaient `adaptation` ou `organisation` dans `competenceId`, le
-- champ des MOMENTS du cycle (22 actifs). Ils passent du côté transversal, qui
-- est leur vraie nature : ces deux compétences n'ont aucun module de formation
-- précisément parce qu'elles ne sont pas une étape, elles s'exercent pendant
-- toutes les étapes.
--
-- 🔴 AUCUNE PERTE, ET RÉVERSIBLE EN UNE LIGNE : l'information change de
-- colonne, elle ne disparaît pas. L'inverse serait
--   UPDATE "AtlasFact" SET "competenceId" = "transversaleId", "transversaleId" = NULL
--   WHERE "transversaleId" IS NOT NULL;
--
-- ⚠️ `competenceId` devient NULL pour ces faits, et c'est juste : on ne sait
-- PAS à quel moment du cycle ils appartenaient. Inventer un moment serait pire
-- que l'absence — et c'est l'absence qui dira au modèle de le renseigner la
-- prochaine fois qu'il revoit le sujet.
UPDATE "AtlasFact"
SET "transversaleId" = "competenceId",
    "competenceId" = NULL
WHERE "competenceId" IN ('adaptation', 'organisation');
