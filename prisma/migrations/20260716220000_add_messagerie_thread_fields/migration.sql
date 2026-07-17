-- Nav messagerie (tranche 0) : fils d'agents + dernier brouillon par contact
ALTER TABLE "Contact" ADD COLUMN "lastDraft" TEXT;
ALTER TABLE "Contact" ADD COLUMN "lastDraftAt" TIMESTAMP(3);
ALTER TABLE "AtlasConversation" ADD COLUMN "agent" TEXT NOT NULL DEFAULT 'atlas';
