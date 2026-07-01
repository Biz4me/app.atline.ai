-- CreateEnum
CREATE TYPE "MarketTemp" AS ENUM ('CHAUD', 'TIEDE', 'FROID');

-- AlterTable User : couleur de personnalité de l'utilisateur (4 Couleurs Big Al)
ALTER TABLE "User" ADD COLUMN "personality" "PersonalityType";

-- AlterTable Contact : marché / proximité relationnelle, distinct du funnel
ALTER TABLE "Contact" ADD COLUMN "market" "MarketTemp";
