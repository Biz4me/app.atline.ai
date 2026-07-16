-- Date de passage PARTENAIRE (issue « signé » du débrief) — mesure de l'objectif mensuel
ALTER TABLE "Contact" ADD COLUMN "signedAt" TIMESTAMP(3);
