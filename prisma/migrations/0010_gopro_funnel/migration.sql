-- Funnel prospect en jargon Go Pro (Eric Worre, Skills 2/3/4) : Invitation, Présentation, Suivi
ALTER TYPE "ProspectStage" RENAME VALUE 'CONTACTE' TO 'INVITATION';
ALTER TYPE "ProspectStage" RENAME VALUE 'QUALIFIE' TO 'SUIVI';
ALTER TYPE "ProspectStage" ADD VALUE 'PRESENTATION';

-- Démarrage du nouveau partenaire (Go Pro Skill 6 « Get Started Right »)
ALTER TYPE "PartnerStage" RENAME VALUE 'INTEGRATION' TO 'DEMARRAGE';

-- Compteur d'expositions (Worre : ~4-6 expositions avant décision) — auto-incrémenté par les actions CRM
ALTER TABLE "Contact" ADD COLUMN "exposures" INTEGER NOT NULL DEFAULT 0;
