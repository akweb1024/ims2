-- CreateTable
CREATE TABLE "ApplicationCommunication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CommunicationType" NOT NULL DEFAULT 'CALL',
    "subject" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "outcome" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUpDate" TIMESTAMP(3),
    "isFollowUpCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationCommunication_applicationId_idx" ON "ApplicationCommunication"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationCommunication_nextFollowUpDate_idx" ON "ApplicationCommunication"("nextFollowUpDate");

-- AddForeignKey
ALTER TABLE "ApplicationCommunication" ADD CONSTRAINT "ApplicationCommunication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationCommunication" ADD CONSTRAINT "ApplicationCommunication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

