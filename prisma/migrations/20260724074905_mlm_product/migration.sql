-- CreateTable
CREATE TABLE "MlmProduct" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "usage" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "format" TEXT,
    "imageUrl" TEXT,
    "sourceUrl" TEXT,
    "extra" JSONB,
    "status" "MlmCompanyStatus" NOT NULL DEFAULT 'PUBLISHED',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlmProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MlmProduct_companyId_idx" ON "MlmProduct"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MlmProduct_companyId_slug_key" ON "MlmProduct"("companyId", "slug");

-- AddForeignKey
ALTER TABLE "MlmProduct" ADD CONSTRAINT "MlmProduct_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "MlmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
