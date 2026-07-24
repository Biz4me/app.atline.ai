-- CreateEnum
CREATE TYPE "MlmCompanyStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "UserMlmBusiness" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "MlmCompany" (
    "id" TEXT NOT NULL,
    "brandSlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "locale" TEXT NOT NULL DEFAULT 'fr-FR',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "category" TEXT,
    "officialUrl" TEXT,
    "status" "MlmCompanyStatus" NOT NULL DEFAULT 'DRAFT',
    "fiche" JSONB NOT NULL DEFAULT '{}',
    "sources" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlmCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MlmCompany_slug_key" ON "MlmCompany"("slug");

-- CreateIndex
CREATE INDEX "MlmCompany_brandSlug_idx" ON "MlmCompany"("brandSlug");

-- CreateIndex
CREATE UNIQUE INDEX "MlmCompany_brandSlug_country_key" ON "MlmCompany"("brandSlug", "country");

-- CreateIndex
CREATE INDEX "UserMlmBusiness_companyId_idx" ON "UserMlmBusiness"("companyId");

-- AddForeignKey
ALTER TABLE "UserMlmBusiness" ADD CONSTRAINT "UserMlmBusiness_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "MlmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
