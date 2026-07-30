-- État de la surveillance des réponses (canal e-mail, phase 4).
--
-- watchExpiration : Google coupe la surveillance au bout de 7 jours. Sans
-- renouvellement, le distributeur cesse de recevoir les réponses de ses
-- prospects et rien ne le lui dit.
--
-- historyId : notre curseur de lecture, avancé UNIQUEMENT après un traitement
-- réussi. L'historique Gmail étant cumulatif depuis ce point, une notification
-- perdue se rattrape d'elle-même à la suivante.

ALTER TABLE "GoogleConnection" ADD COLUMN "watchExpiration" TIMESTAMP(3);
ALTER TABLE "GoogleConnection" ADD COLUMN "historyId" TEXT;

-- La réponse du prospect. On ne conserve que les conversations pilotées depuis
-- Atline : le reste de la boîte n'est ni lu, ni stocké, ni indexé.
ALTER TABLE "EmailFil" ADD COLUMN "dernierRecu" TEXT;
ALTER TABLE "EmailFil" ADD COLUMN "dernierRecuAt" TIMESTAMP(3);
