-- Bloc mémoire par contact, auto-édité par Atlas (MemGPT-style)
ALTER TABLE "Contact" ADD COLUMN "atlasMemory" TEXT;
ALTER TABLE "Contact" ADD COLUMN "atlasMemoryAt" TIMESTAMP(3);
