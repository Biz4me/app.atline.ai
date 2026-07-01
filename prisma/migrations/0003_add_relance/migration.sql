-- CreateTable
CREATE TABLE "Relance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Relance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Relance_status_dueAt_idx" ON "Relance"("status", "dueAt");
