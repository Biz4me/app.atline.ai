-- De quoi REPONDRE dans Chatwoot (29 juillet 2026).
-- Le jeton du compte de service : l'API application n'accepte pas le jeton
-- plateforme. Et le reglage envoi direct / validation, FAUX par defaut :
-- Orion propose, le distributeur valide.
ALTER TABLE "UserMlmBusiness" ADD COLUMN "chatwootUserToken"    TEXT;
ALTER TABLE "UserMlmBusiness" ADD COLUMN "chatwootAutoRepondre" BOOLEAN NOT NULL DEFAULT false;
