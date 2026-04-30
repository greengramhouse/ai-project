-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "pictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_sessions" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING_FOR_IMAGE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_lineUserId_key" ON "user_profiles"("lineUserId");

-- CreateIndex
CREATE INDEX "ocr_sessions_lineUserId_status_idx" ON "ocr_sessions"("lineUserId", "status");

-- AddForeignKey
ALTER TABLE "ocr_sessions" ADD CONSTRAINT "ocr_sessions_lineUserId_fkey" FOREIGN KEY ("lineUserId") REFERENCES "user_profiles"("lineUserId") ON DELETE CASCADE ON UPDATE CASCADE;
