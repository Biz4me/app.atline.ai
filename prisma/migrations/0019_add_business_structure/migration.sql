-- Structure de départ (baseline) de l'activité MLM : { directs, total, clients }.
ALTER TABLE "UserMlmBusiness" ADD COLUMN "structure" JSONB;
