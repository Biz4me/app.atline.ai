-- La confiance dans un lien se mesure (29 juillet 2026).
-- Un lien de parrainage perime est PIRE qu absent : il donne l illusion de
-- marcher pendant que les filleuls partent chez quelqu un d autre.
ALTER TABLE "ToolboxLink" ADD COLUMN "verifieAt"   TIMESTAMP(3);
ALTER TABLE "ToolboxLink" ADD COLUMN "statutVerif" TEXT;
ALTER TABLE "ToolboxLink" ADD COLUMN "detailVerif" TEXT;
