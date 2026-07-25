-- Upgrade IT support tickets into a general cross-department support system:
-- a target department, a resolvedAt timestamp, and a follow-up comment thread.
-- Purely additive: two nullable columns on ITSupportTicket + one new table.

-- AlterTable
ALTER TABLE "ITSupportTicket" ADD COLUMN     "departmentId" TEXT;
ALTER TABLE "ITSupportTicket" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ITSupportTicket_departmentId_idx" ON "ITSupportTicket"("departmentId");

-- AddForeignKey
ALTER TABLE "ITSupportTicket" ADD CONSTRAINT "ITSupportTicket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ITSupportTicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ITSupportTicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ITSupportTicketComment_ticketId_idx" ON "ITSupportTicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "ITSupportTicketComment_userId_idx" ON "ITSupportTicketComment"("userId");

-- AddForeignKey
ALTER TABLE "ITSupportTicketComment" ADD CONSTRAINT "ITSupportTicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ITSupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITSupportTicketComment" ADD CONSTRAINT "ITSupportTicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
