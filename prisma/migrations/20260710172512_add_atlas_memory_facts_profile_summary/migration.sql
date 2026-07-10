-- AlterTable
ALTER TABLE "AtlasConversation" ADD COLUMN     "summarizedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "atlasProfile" TEXT,
ADD COLUMN     "atlasProfileAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AtlasFact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "predicate" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "supportCount" INTEGER NOT NULL DEFAULT 1,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "supersededById" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlasFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtlasFact_userId_contactId_status_idx" ON "AtlasFact"("userId", "contactId", "status");

-- CreateIndex
CREATE INDEX "AtlasFact_userId_status_importance_idx" ON "AtlasFact"("userId", "status", "importance");

-- AddForeignKey
ALTER TABLE "AtlasFact" ADD CONSTRAINT "AtlasFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
