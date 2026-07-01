-- Alignement Contact ↔ profil utilisateur (conversion prospect→partenaire) + traçage conversion
ALTER TABLE "Contact" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Contact" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Contact" ADD COLUMN "gender" TEXT;
ALTER TABLE "Contact" ADD COLUMN "phone2" TEXT;
ALTER TABLE "Contact" ADD COLUMN "convertedUserId" TEXT;

-- Sources enrichies (origine réelle du contact)
ALTER TYPE "ContactSource" ADD VALUE 'FAMILLE';
ALTER TYPE "ContactSource" ADD VALUE 'REFERE';
ALTER TYPE "ContactSource" ADD VALUE 'CONNAISSANCE';
ALTER TYPE "ContactSource" ADD VALUE 'CAMPAGNE_EMAIL';
ALTER TYPE "ContactSource" ADD VALUE 'PAGE_CAPTURE';
ALTER TYPE "ContactSource" ADD VALUE 'EVENEMENT';
