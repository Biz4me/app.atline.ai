-- Nova : modèle campagne autopilote (Campaign + Lead) + rattachement des posts à une campagne.

-- CreateEnum
CREATE TYPE "CampaignGoal" AS ENUM ('CLIENTS', 'PARTENAIRES');

-- CreateEnum
CREATE TYPE "MeetingFormat" AS ENUM ('TETE_A_TETE', 'GROUPE');

-- CreateEnum
CREATE TYPE "ContentMode" AS ENUM ('FACE', 'FACELESS');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('BROUILLON', 'ACTIVE', 'PAUSE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "LeadMaturity" AS ENUM ('CURIEUX', 'QUALIFIE', 'PRET');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('INSCRIT', 'RAPPELE', 'PRESENT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "LeadOutcome" AS ENUM ('INTERESSE', 'CONVERTI', 'PAS_INTERESSE', 'NO_SHOW');

-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Nouvelle campagne',
    "goal" "CampaignGoal" NOT NULL,
    "audience" JSONB,
    "offerPitch" TEXT,
    "meetingFormat" "MeetingFormat",
    "meetingConfig" JSONB,
    "channels" "SocialPlatform"[],
    "contentMode" "ContentMode" NOT NULL DEFAULT 'FACELESS',
    "cadence" INTEGER NOT NULL DEFAULT 5,
    "status" "CampaignStatus" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "sourceChannel" "SocialPlatform",
    "maturity" "LeadMaturity" NOT NULL DEFAULT 'CURIEUX',
    "intent" TEXT,
    "meetingStatus" "MeetingStatus",
    "outcome" "LeadOutcome",
    "brief" TEXT,
    "conversation" JSONB,
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
