-- Pourquoi une simulation vocale s'est arrêtée.
--
-- Patrice avait signalé que « les conversations se coupaient au bout d'un certain
-- temps » : c'était le plafond `max_call_seconds`, mais rien ne le disait. On garde
-- désormais la cause (raccroché, plafond atteint, erreur) pour que le comportement
-- soit lisible au lieu d'être subi.

ALTER TABLE "SimSession" ADD COLUMN "raisonFin" TEXT;
