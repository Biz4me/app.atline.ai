/*
  Warnings:

  - You are about to drop the column `boutiqueUrl` on the `UserMlmBusiness` table. All the data in the column will be lost.
  - You are about to drop the column `parrainageUrl` on the `UserMlmBusiness` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserMlmBusiness" DROP COLUMN "boutiqueUrl",
DROP COLUMN "parrainageUrl";
