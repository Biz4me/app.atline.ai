-- Renomme la dernière étape prospect CHAUD → CLOSING (anti-confusion avec MarketTemp.CHAUD)
-- RENAME VALUE : en place, les lignes existantes reflètent automatiquement la nouvelle valeur.
ALTER TYPE "ProspectStage" RENAME VALUE 'CHAUD' TO 'CLOSING';
