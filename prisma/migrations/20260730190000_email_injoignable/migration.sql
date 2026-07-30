-- Une adresse morte n'est pas un refus.
--
-- Jusqu'ici un échec de remise arrivait dans le fil d'origine et se faisait
-- passer pour une réponse du prospect. On ajoute l'issue qui manquait, pour
-- pouvoir fermer la conversation sans prétendre que quelqu'un a décidé quoi
-- que ce soit.

ALTER TYPE "EmailIssue" ADD VALUE 'INJOIGNABLE';
