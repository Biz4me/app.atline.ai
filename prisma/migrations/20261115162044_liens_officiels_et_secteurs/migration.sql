-- AlterTable
ALTER TABLE "MlmCompany" ADD COLUMN     "doublonDe" TEXT,
ADD COLUMN     "liensVerifiesLe" TIMESTAMP(3),
ADD COLUMN     "multiniveau" BOOLEAN,
ADD COLUMN     "secteurs" TEXT[],
ADD COLUMN     "siteFrance" TEXT,
ADD COLUMN     "siteFranceSource" TEXT;

-- AlterTable
ALTER TABLE "UserMlmBusiness" ADD COLUMN     "boutiqueUrl" TEXT,
ADD COLUMN     "parrainageUrl" TEXT;
