-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'DAILY';

-- AlterTable
ALTER TABLE "AtlasReport" ADD COLUMN     "audioAt" TIMESTAMP(3),
ADD COLUMN     "audioFichier" TEXT,
ADD COLUMN     "audioOctets" INTEGER,
ADD COLUMN     "audioSecondes" INTEGER,
ADD COLUMN     "audioVoix" TEXT;

-- CreateIndex
CREATE INDEX "AtlasReport_userId_createdAt_idx" ON "AtlasReport"("userId", "createdAt");
