-- Ce que Deepgram facture réellement, par simulation.
--
-- Le recoupement du 31 juillet 2026 a montré un écart systématique : Deepgram
-- facture ~25 % de plus que ce que la session compte elle-même (24,45 s contre
-- 20,1 s ; 18,85 s contre 15,1 s). Leur compteur tourne tant que la connexion de
-- transcription est ouverte, le nôtre ne compte que l'audio traité — la connexion
-- s'ouvre avant que ça parle et se ferme après.
--
-- Calculer le coût sur NOTRE chiffre l'aurait donc sous-estimé d'un quart. On garde
-- les deux colonnes : la nôtre est immédiate et sert à l'affichage à chaud, la leur
-- fait foi et arrive après coup par réconciliation (rattachée sans ambiguïté grâce à
-- l'étiquette `sim-<id>` que l'agent pose sur chaque flux Deepgram).

ALTER TABLE "SimSession" ADD COLUMN "sttSecondesFacturees" DOUBLE PRECISION;
ALTER TABLE "SimSession" ADD COLUMN "factureAt" TIMESTAMP(3);
