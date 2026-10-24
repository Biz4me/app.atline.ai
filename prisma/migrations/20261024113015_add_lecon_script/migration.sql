-- CreateTable
CREATE TABLE "LeconScript" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "empreinteSource" TEXT NOT NULL,
    "etat" TEXT NOT NULL DEFAULT 'brouillon',
    "modele" TEXT NOT NULL,
    "termesManques" INTEGER NOT NULL DEFAULT 0,
    "manquants" TEXT[],
    "carSource" INTEGER NOT NULL,
    "carScript" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeconScript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeconScript_lessonId_key" ON "LeconScript"("lessonId");

-- AddForeignKey
ALTER TABLE "LeconScript" ADD CONSTRAINT "LeconScript_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LmsLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
