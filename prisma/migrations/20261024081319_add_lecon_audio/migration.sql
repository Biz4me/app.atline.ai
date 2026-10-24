-- CreateTable
CREATE TABLE "LeconAudio" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "voix" TEXT NOT NULL,
    "fichier" TEXT NOT NULL,
    "secondes" INTEGER NOT NULL,
    "octets" INTEGER NOT NULL,
    "empreinte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeconAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeconAudio_lessonId_voix_key" ON "LeconAudio"("lessonId", "voix");

-- AddForeignKey
ALTER TABLE "LeconAudio" ADD CONSTRAINT "LeconAudio_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LmsLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
