-- AlterTable
ALTER TABLE "AtlasFact" ADD COLUMN     "competenceId" TEXT;

-- AlterTable
ALTER TABLE "LmsModule" ADD COLUMN     "competenceId" TEXT;

-- AlterTable
ALTER TABLE "SimSession" ADD COLUMN     "scenarioId" TEXT;

-- CreateTable
CREATE TABLE "Competence" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimScenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "objectif" TEXT NOT NULL,
    "phase" "SimPhase" NOT NULL,
    "difficulty" "SimDiff",
    "position" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimScore" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompetence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL DEFAULT 0,
    "mesures" INTEGER NOT NULL DEFAULT 0,
    "derniereAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompetenceToSimScenario" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Competence_position_key" ON "Competence"("position");

-- CreateIndex
CREATE UNIQUE INDEX "SimScenario_slug_key" ON "SimScenario"("slug");

-- CreateIndex
CREATE INDEX "SimScore_competenceId_score_idx" ON "SimScore"("competenceId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "SimScore_sessionId_competenceId_key" ON "SimScore"("sessionId", "competenceId");

-- CreateIndex
CREATE INDEX "UserCompetence_userId_niveau_idx" ON "UserCompetence"("userId", "niveau");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompetence_userId_competenceId_key" ON "UserCompetence"("userId", "competenceId");

-- CreateIndex
CREATE UNIQUE INDEX "_CompetenceToSimScenario_AB_unique" ON "_CompetenceToSimScenario"("A", "B");

-- CreateIndex
CREATE INDEX "_CompetenceToSimScenario_B_index" ON "_CompetenceToSimScenario"("B");

-- AddForeignKey
ALTER TABLE "AtlasFact" ADD CONSTRAINT "AtlasFact_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsModule" ADD CONSTRAINT "LmsModule_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimSession" ADD CONSTRAINT "SimSession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimScore" ADD CONSTRAINT "SimScore_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimScore" ADD CONSTRAINT "SimScore_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetence" ADD CONSTRAINT "UserCompetence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetence" ADD CONSTRAINT "UserCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetenceToSimScenario" ADD CONSTRAINT "_CompetenceToSimScenario_A_fkey" FOREIGN KEY ("A") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetenceToSimScenario" ADD CONSTRAINT "_CompetenceToSimScenario_B_fkey" FOREIGN KEY ("B") REFERENCES "SimScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════
-- LES 11 COMPÉTENCES — on ne les invente pas, ce sont les 11 modules
-- de la formation. Déjà nommés en verbes d'action, déjà enseignés, et le
-- simulateur en utilise déjà quatre sous le nom de SimPhase.
-- L'id est un slug stable et lisible : il voyage dans les prompts et les logs.
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO "Competence" ("id", "position", "label") VALUES
  ('etat-esprit',  1,  'État d''esprit'),
  ('pourquoi',     2,  'Pourquoi et projet'),
  ('demarrage',    3,  'Démarrage 72 h'),
  ('liste-noms',   4,  'Liste de noms'),
  ('invitation',   5,  'Invitation sans vendre'),
  ('presentation', 6,  'Présentation'),
  ('suivi',        7,  'Relancer sans harceler'),
  ('objections',   8,  'Objections'),
  ('conclusion',   9,  'Conclure'),
  ('duplication',  10, 'Duplication'),
  ('leadership',   11, 'Leadership')
ON CONFLICT ("id") DO NOTHING;

-- ── Le chaînon qui manquait : chaque module enseigne une compétence ──
-- Rattachement explicite par position (les modules sont indexés à partir de 0).
UPDATE "LmsModule" m SET "competenceId" = v.cid
FROM (VALUES
  (0,'etat-esprit'), (1,'pourquoi'),   (2,'demarrage'),  (3,'liste-noms'),
  (4,'invitation'),  (5,'presentation'),(6,'suivi'),     (7,'objections'),
  (8,'conclusion'),  (9,'duplication'),(10,'leadership')
) AS v(pos, cid)
WHERE m.position = v.pos AND m."competenceId" IS NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- RATTRAPAGE 1 — la mémoire d'Atlas cesse de répéter
-- En production, `bloque_sur` contenait « perte de foi » (11), « manque de
-- motivation » (8), « manque motivation » (2), « manque motivation et foi »
-- (2) : 23 observations du MÊME défaut, qui ne se comptaient jamais ensemble.
-- `object` garde la formulation libre d'Atlas (la nuance est utile) ;
-- `competenceId` permet enfin de COMPTER.
-- Ordre volontaire : du plus spécifique au plus large, chaque passe ne
-- touchant que ce qui est encore nul.
-- ═══════════════════════════════════════════════════════════════════════
UPDATE "AtlasFact" SET "competenceId" = 'objections'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%objection%' OR object ILIKE '%pyramide%' OR object ILIKE '%putation%');

UPDATE "AtlasFact" SET "competenceId" = 'conclusion'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%conclusion%' OR object ILIKE '%conclure%' OR object ILIKE '%closing%');

UPDATE "AtlasFact" SET "competenceId" = 'invitation'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%invitation%' OR object ILIKE '%accroche%'
      OR object ILIKE '%ouverture%' OR object ILIKE '%march_ froid%');

UPDATE "AtlasFact" SET "competenceId" = 'suivi'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%relance%' OR object ILIKE '%suivi%' OR object ILIKE '%harc%');

UPDATE "AtlasFact" SET "competenceId" = 'presentation'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND object ILIKE '%sentation%';

UPDATE "AtlasFact" SET "competenceId" = 'liste-noms'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%liste%' OR object ILIKE '%liste de noms%');

UPDATE "AtlasFact" SET "competenceId" = 'demarrage'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%marrage%' OR object ILIKE '%fondation%' OR object ILIKE '%72%');

UPDATE "AtlasFact" SET "competenceId" = 'pourquoi'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND object ILIKE '%pourquoi%';

UPDATE "AtlasFact" SET "competenceId" = 'duplication'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%duplication%' OR object ILIKE '%filleul%' OR object ILIKE '%quipe%');

UPDATE "AtlasFact" SET "competenceId" = 'leadership'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND object ILIKE '%leadership%';

-- En dernier, le plus large : motivation, foi, mental.
-- C'est là que « perte de foi » et « manque de motivation » se rejoignent.
UPDATE "AtlasFact" SET "competenceId" = 'etat-esprit'
  WHERE predicate = 'bloque_sur' AND "competenceId" IS NULL
    AND (object ILIKE '%motivation%' OR object ILIKE '%foi%'
      OR object ILIKE '%mental%' OR object ILIKE '%tat d%esprit%');

-- Ce qui reste NUL est un signal, pas un échec : en production, les blocages
-- « adaptation profil bleu/vert » ne rentrent dans AUCUNE des 11 compétences,
-- parce qu'ils relèvent de la MANIÈRE de parler, pas de l'étape du métier.
-- C'est exactement le second axe laissé de côté pour l'instant. À relire
-- quand il y aura assez de mesures pour le trancher.

-- ═══════════════════════════════════════════════════════════════════════
-- RATTRAPAGE 2 — l'historique du simulateur n'est pas perdu
-- 27 sessions notées existent déjà. Chaque SimPhase correspond à une
-- compétence (c'est le vocabulaire qui était DÉJÀ partagé). On part donc
-- avec des niveaux réels, pas avec des zéros.
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO "UserCompetence" ("id", "userId", "competenceId", "niveau", "mesures", "derniereAt", "updatedAt")
SELECT gen_random_uuid()::text, s."userId", v.cid,
       round(avg(s.score))::int, count(*)::int, max(s."startedAt"), now()
FROM "SimSession" s
JOIN (VALUES
  ('INVITATION','invitation'), ('SUIVI','suivi'),
  ('DEMARRAGE','demarrage'),   ('COACHING','duplication')
) AS v(ph, cid) ON v.ph = s.phase::text
WHERE s.score IS NOT NULL
GROUP BY s."userId", v.cid
ON CONFLICT ("userId", "competenceId") DO NOTHING;
