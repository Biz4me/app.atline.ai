-- Mémoire partagée, plumes multiples : chaque fait sait de quel agent il vient.
ALTER TABLE "AtlasFact" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'atlas';
