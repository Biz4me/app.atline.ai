-- Ce qu'une simulation vocale a réellement consommé.
--
-- On stocke la mesure BRUTE que l'agent relève chez les fournisseurs eux-mêmes
-- (une entrée par modèle sollicité : secondes transcrites, tokens, caractères),
-- jamais un coût déjà calculé. Un tarif qui change ne doit pas rendre l'historique
-- faux : le coût se recalcule à l'affichage, la consommation, elle, est un fait.
--
-- Nullable partout : toutes les sessions antérieures au 31 juillet 2026 n'ont
-- jamais été mesurées, et prétendre qu'elles ont coûté zéro serait un mensonge.

ALTER TABLE "SimSession" ADD COLUMN "dureeSecondes" DOUBLE PRECISION;
ALTER TABLE "SimSession" ADD COLUMN "consommation" JSONB;
