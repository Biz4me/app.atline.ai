-- Presence France (29 juillet 2026).
-- Le champ qui manquait : la base etait riche en societes americaines et vide
-- la ou un distributeur francais cherche. Source principale : la FVD
-- (federation professionnelle, donc verifie), completee par Epixel et Reussir VDI.
ALTER TABLE "MlmCompany" ADD COLUMN "franceOperee"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MlmCompany" ADD COLUMN "siret"         TEXT;
ALTER TABLE "MlmCompany" ADD COLUMN "fvdMembre"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MlmCompany" ADD COLUMN "fvdDepuis"     INTEGER;
ALTER TABLE "MlmCompany" ADD COLUMN "anneeCreation" INTEGER;
ALTER TABLE "MlmCompany" ADD COLUMN "caMondialM"    DOUBLE PRECISION;
CREATE INDEX "MlmCompany_franceOperee_idx" ON "MlmCompany"("franceOperee");
