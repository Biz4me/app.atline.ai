-- Suppression de la feature morte "daily-plan" (remplacée par /api/plan/today,
-- qui recalcule à la volée sans persister). Tables vides (0 ligne) au moment du drop.

-- DropForeignKey
ALTER TABLE "DailyPlan" DROP CONSTRAINT "DailyPlan_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyPlan" DROP CONSTRAINT "DailyPlan_mlmBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "DailyTask" DROP CONSTRAINT "DailyTask_planId_fkey";

-- DropTable
DROP TABLE "DailyPlan";

-- DropTable
DROP TABLE "DailyTask";
